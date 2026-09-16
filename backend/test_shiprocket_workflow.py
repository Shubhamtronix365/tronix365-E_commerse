import sys
import os
from unittest.mock import patch, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import OrderDB, ProductDB, OrderItemDB
from services.shiprocket import (
    shiprocket_automation,
    shiprocket_config,
)


def test_shipping_eligibility_filter():
    print("[TEST 1] Testing Shipping Method Eligibility Filter...")
    # These must NOT go to Shiprocket
    non_eligible = [
        "pickup",
        "Store Pickup (Pune)",
        "store_pickup",
        "office pickup",
        "Office_Pickup",
        "Free Delivery",
        "free_delivery",
        "self pickup",
        "local pickup",
    ]
    for method in non_eligible:
        assert not shiprocket_automation.is_shiprocket_eligible(method), f"Method '{method}' should NOT be eligible for Shiprocket!"
    print("  [OK] Store/Office Pickup and Free Delivery are correctly blocked from Shiprocket.")

    # These MUST go to Shiprocket
    eligible = [
        "surface",
        "Surface Shipping",
        "express",
        "Express Shipping",
        "standard",
        "courier",
        None,
    ]
    for method in eligible:
        assert shiprocket_automation.is_shiprocket_eligible(method), f"Method '{method}' SHOULD be eligible for Shiprocket!"
    print("  [OK] Surface, Express, and Standard courier delivery are correctly routed to Shiprocket.")


def test_auto_create_skips_pickup():
    print("[TEST 2] Testing Auto-Create skips pickup orders...")
    db = SessionLocal()
    try:
        order = OrderDB(
            customer_email="pickup_test@tronix365.in",
            total_amount=500.0,
            status="pending",
            full_name="Office Visitor",
            phone="9876543210",
            address_line="Pune Office Counter",
            city="Pune",
            state="Maharashtra",
            pincode="411001",
            shipping_method="Store Pickup (Pune)"
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        result = shiprocket_automation.auto_create_shiprocket_shipment(order.id)
        assert result is None, "Pickup order should not have triggered Shiprocket shipment!"

        # Verify no shiprocket IDs were set
        db.refresh(order)
        assert order.shiprocket_order_id is None
        assert order.shiprocket_shipment_id is None
        print("  [OK] Pickup order cleanly bypassed Shiprocket dispatch.")
    finally:
        if 'order' in locals() and order.id:
            db.delete(order)
            db.commit()
        db.close()


def test_auto_create_and_cancel_surface_shipment():
    print("[TEST 3] Testing Automated Surface Shipping Order Placement and Cancellation...")
    db = SessionLocal()
    try:
        # Create product for order
        product = ProductDB(
            title="Auto Ship Test Board",
            price=299.0,
            stock=50,
            sku="TEST-BOARD-01",
            weight=0.15,
            length=12.0,
            breadth=8.0,
            height=3.0
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        # Create order
        order = OrderDB(
            customer_email="autotest@tronix365.in",
            total_amount=299.0,
            status="pending",
            full_name="Automation Tester",
            phone="9876543210",
            address_line="123 Silicon Highway",
            city="Pune",
            state="Maharashtra",
            pincode="411001",
            shipping_method="surface"
        )
        order_item = OrderItemDB(
            product_id=product.id,
            quantity=1,
            price_at_purchase=299.0
        )
        order.items.append(order_item)
        db.add(order)
        db.commit()
        db.refresh(order)

        # Mock Shiprocket client and config so test runs independently of live credentials
        orig_email = shiprocket_config.email
        orig_pass = shiprocket_config.password
        shiprocket_config.email = "test@tronix365.in"
        shiprocket_config.password = "testpassword"

        try:
            with patch('services.shiprocket.client.shiprocket_client.post') as mock_post:
                mock_post.return_value = {
                    "order_id": "SR-AUTO-9988",
                    "shipment_id": "SR-SHIP-7766",
                    "status": "NEW",
                    "status_code": 1
                }

                result = shiprocket_automation.auto_create_shiprocket_shipment(order.id)
                assert result is not None, "Surface order should trigger Shiprocket order creation!"

                db.refresh(order)
                assert order.shiprocket_order_id == "SR-AUTO-9988"
                assert order.shiprocket_shipment_id == "SR-SHIP-7766"
                print("  [OK] Order successfully placed in Shiprocket automatically upon placement.")

                # Test Cancellation
                mock_post.return_value = {"status": "SUCCESS", "message": "Order cancelled"}
                cancel_result = shiprocket_automation.auto_cancel_shiprocket_shipment(order.id, reason="Customer request")
                assert cancel_result is not None

                db.refresh(order)
                assert order.shiprocket_status == "CANCELLED"
                print("  [OK] Order cancellation in Admin successfully synced and cancelled on Shiprocket.")
        finally:
            shiprocket_config.api_email = orig_email
            shiprocket_config.api_password = orig_pass

    finally:
        if 'order' in locals() and order.id:
            db.delete(order)
        if 'product' in locals() and product.id:
            db.delete(product)
        db.commit()
        db.close()


def test_shiprocket_webhook():
    print("[TEST 4] Testing Real-Time Tracking Webhook...")
    db = SessionLocal()
    try:
        order = OrderDB(
            customer_email="webhook_test@tronix365.in",
            total_amount=799.0,
            status="confirmed",
            full_name="Webhook User",
            phone="9876543210",
            address_line="456 Express Blvd",
            city="Pune",
            state="Maharashtra",
            pincode="411001",
            shipping_method="express",
            shiprocket_order_id="99881122",
            shiprocket_shipment_id="55443322"
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        # 1. Delivery update webhook
        payload = {
            "order_id": f"TRONIX-ORD-{order.id}",
            "shipment_id": "55443322",
            "awb": "DELHIVERY-98765432",
            "courier_name": "Delhivery Surface",
            "current_status": "DELIVERED"
        }

        res = shiprocket_automation.process_shiprocket_webhook(payload)
        assert res.get("status") == "success"

        db.refresh(order)
        assert order.status == "delivered"
        assert order.shiprocket_status == "DELIVERED"
        assert order.shiprocket_awb_code == "DELHIVERY-98765432"
        assert order.courier == "Delhivery Surface"
        print("  [OK] Webhook successfully updated Order to 'delivered', synced AWB & Courier.")
    finally:
        if 'order' in locals() and order.id:
            db.delete(order)
            db.commit()
        db.close()


def run_all_workflow_tests():
    print("=" * 65)
    print("RUNNING SHIPROCKET AUTOMATED WORKFLOW TEST SUITE")
    print("=" * 65)
    test_shipping_eligibility_filter()
    test_auto_create_skips_pickup()
    test_auto_create_and_cancel_surface_shipment()
    test_shiprocket_webhook()
    print("=" * 65)
    print("ALL 4 AUTOMATED WORKFLOW TESTS PASSED CLEANLY! [OK]")
    print("=" * 65)


if __name__ == "__main__":
    run_all_workflow_tests()
