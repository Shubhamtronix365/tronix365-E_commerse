import os
import sys
from database import SessionLocal, engine, Base
import models
from models import OrderDB, OrderItemDB, ProductDB, EmailLogDB
from email_utils import send_order_status_email, generate_order_status_email_html

def run_tests():
    print("==================================================")
    print("    RUNNING GST & B2B BILLING SYSTEM TESTS        ")
    print("==================================================")

    # 1. Run auto-migration
    Base.metadata.create_all(bind=engine)
    from auto_migrate import auto_migrate
    auto_migrate()

    db = SessionLocal()
    try:
        # Get or create product
        product = db.query(ProductDB).first()
        if not product:
            product = ProductDB(
                title="STM32F4 Discovery Development Board",
                description="ARM Cortex-M4 microcontroller board",
                price=2499.0,
                category="Microcontrollers",
                stock=25
            )
            db.add(product)
            db.commit()
            db.refresh(product)

        # Create B2B Order with GST details
        total_amount = 2499.0
        gst_rate = 18.0
        subtotal_before_gst = round(total_amount / 1.18, 2)
        gst_amount = round(total_amount - subtotal_before_gst, 2)

        b2b_order = OrderDB(
            customer_email="corporate.purchasing@acmetech.com",
            total_amount=total_amount,
            status="pending",
            full_name="Vikramaditya Rao",
            phone="9876543210",
            address_line="Suite 402, Cyber Towers, Hitec City",
            city="Hyderabad",
            state="Telangana",
            pincode="500081",
            is_gst_invoice=True,
            gstin="36AAACA1234A1Z8",
            company_name="Acme Technologies India Pvt Ltd",
            company_address="Suite 402, Cyber Towers, Hitec City, Hyderabad, 500081",
            gst_rate=gst_rate,
            gst_amount=gst_amount,
            subtotal_before_gst=subtotal_before_gst
        )

        item = OrderItemDB(product_id=product.id, quantity=1, price_at_purchase=2499.0)
        b2b_order.items.append(item)
        db.add(b2b_order)
        db.commit()
        db.refresh(b2b_order)

        print(f"[OK] B2B GST Order created successfully in DB (Order #{b2b_order.id})")
        print(f"   Subtotal (Excl. GST): Rs. {b2b_order.subtotal_before_gst}")
        print(f"   GST Amount (18%):     Rs. {b2b_order.gst_amount}")
        print(f"   Total Amount:         Rs. {b2b_order.total_amount}")
        print(f"   Company Name:         {b2b_order.company_name}")
        print(f"   GSTIN:                {b2b_order.gstin}")

        # Test HTML template generation
        frontend_url = "http://localhost:5173"
        html = generate_order_status_email_html(b2b_order, "confirmed", frontend_url)
        
        assert "36AAACA1234A1Z8" in html, "GSTIN missing from HTML email template!"
        assert "Acme Technologies India Pvt Ltd" in html, "Company Name missing from HTML email template!"
        assert "CGST (9%)" in html, "CGST 9% row missing from email calculation table!"
        assert "SGST (9%)" in html, "SGST 9% row missing from email calculation table!"
        print("[OK] Verified HTML email template contains B2B GSTIN, Company Name, and 18% CGST/SGST breakdown!")

        # Clean up test order
        db.query(EmailLogDB).filter(EmailLogDB.order_id == b2b_order.id).delete()
        db.delete(b2b_order)
        db.commit()

        print("\n==================================================")
        print("    ALL GST SYSTEM VERIFICATION TESTS PASSED!     ")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
