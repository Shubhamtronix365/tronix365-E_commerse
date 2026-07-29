import os
import sys
from database import SessionLocal, engine, Base
import models
from models import OrderDB, OrderItemDB, ProductDB, EmailLogDB
from email_utils import send_order_status_email, generate_order_status_email_html
from datetime import datetime

def run_tests():
    print("==================================================")
    print("    RUNNING EMAIL NOTIFICATION SYSTEM TESTS      ")
    print("==================================================")

    # 1. Ensure tables exist & auto migrate columns
    Base.metadata.create_all(bind=engine)
    from auto_migrate import auto_migrate
    auto_migrate()

    db = SessionLocal()
    try:
        # Create dummy product if none
        product = db.query(ProductDB).first()
        if not product:
            product = ProductDB(
                title="Raspberry Pi 5 Model B 8GB",
                description="High performance single board computer",
                price=7999.0,
                category="Development Boards",
                image="/assets/logo.png",
                stock=50
            )
            db.add(product)
            db.commit()
            db.refresh(product)

        # Create dummy test order
        test_order = OrderDB(
            customer_email="test.customer@example.com",
            total_amount=7999.0,
            status="pending",
            full_name="Rajesh Sharma",
            phone="9876543210",
            address_line="123 Innovation Park, Block C",
            city="Bengaluru",
            state="Karnataka",
            pincode="560001",
            courier="Porter",
            tracking_number="PTR9928311",
            estimated_delivery_date="August 02, 2026",
            estimated_arrival_time="4:00 PM"
        )
        item = OrderItemDB(product_id=product.id, quantity=1, price_at_purchase=7999.0)
        test_order.items.append(item)
        db.add(test_order)
        db.commit()
        db.refresh(test_order)

        print(f"Created test order #{test_order.id}")

        # Test HTML template generation for multiple statuses
        statuses_to_test = [
            "pending",
            "confirmed",
            "payment_received",
            "processing",
            "packed",
            "shipped",
            "out_for_delivery",
            "delivered",
            "cancelled",
            "refund_initiated",
            "refund_completed",
            "failed_payment",
            "return_requested",
            "return_approved",
            "return_rejected",
            "exchange_approved",
            "exchange_rejected"
        ]

        frontend_url = "http://localhost:5173"
        for st in statuses_to_test:
            html = generate_order_status_email_html(test_order, st, frontend_url)
            assert "TRONIX365" in html, f"Brand name missing in HTML for status {st}"
            assert f"#order_tronix_{test_order.id:04d}" in html, f"Order ID missing for status {st}"
            print(f"[OK] Generated valid HTML template for status: '{st}'")

        # Test Email Dispatch Functionality & Mandatory CC (shubham.tronix365@gmail.com)
        print("\nTesting email dispatch and database audit log...")
        res = send_order_status_email(test_order.id, "shipped")
        print(f"Email Dispatch Result (Brevo API key status): {res}")

        # Verify EmailLogDB entry
        log_entry = db.query(EmailLogDB).filter(EmailLogDB.order_id == test_order.id).order_by(EmailLogDB.id.desc()).first()
        if log_entry:
            print(f"[OK] Database Email Log Created Successfully:")
            print(f"   Log ID: {log_entry.id}")
            print(f"   Recipients: {log_entry.recipient}")
            print(f"   Subject: {log_entry.subject}")
            print(f"   Status Trigger: {log_entry.status_trigger}")
            print(f"   Delivery Status: {log_entry.delivery_status}")
            assert "shubham.tronix365@gmail.com" in log_entry.recipient, "Mandatory CC email missing from log!"
            print("[OK] Verified mandatory recipient shubham.tronix365@gmail.com is present in recipient list!")

        # Clean up test order & logs
        db.query(EmailLogDB).filter(EmailLogDB.order_id == test_order.id).delete()
        db.delete(test_order)
        db.commit()

        print("\n==================================================")
        print("    ALL SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY! ")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
