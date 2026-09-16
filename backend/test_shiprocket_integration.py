"""
Integration test suite for Shiprocket Shipping Integration on Troni365.
Verifies model columns, customer validation, product dimension enforcement,
duplicate prevention, and serviceability routes.
"""

import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
from models import ProductDB, OrderDB, OrderItemDB
from services.shiprocket import (
    shiprocket_config,
    shiprocket_serviceability,
    shiprocket_shipment,
    shiprocket_courier,
    shiprocket_tracking,
)

def test_models_have_shipping_fields():
    print("[TEST 1] Verifying ProductDB and OrderDB model columns...")
    
    # Check ProductDB
    product_cols = [c.name for c in ProductDB.__table__.columns]
    assert "sku" in product_cols, "sku column missing from ProductDB"
    assert "weight" in product_cols, "weight column missing from ProductDB"
    assert "length" in product_cols, "length column missing from ProductDB"
    assert "breadth" in product_cols, "breadth column missing from ProductDB"
    assert "height" in product_cols, "height column missing from ProductDB"
    print("  [OK] ProductDB has sku, weight, length, breadth, height.")

    # Check OrderDB
    order_cols = [c.name for c in OrderDB.__table__.columns]
    assert "country" in order_cols, "country column missing from OrderDB"
    assert "shiprocket_order_id" in order_cols, "shiprocket_order_id missing from OrderDB"
    assert "shiprocket_shipment_id" in order_cols, "shiprocket_shipment_id missing from OrderDB"
    assert "shiprocket_awb_code" in order_cols, "shiprocket_awb_code missing from OrderDB"
    assert "shiprocket_courier_name" in order_cols, "shiprocket_courier_name missing from OrderDB"
    assert "shiprocket_status" in order_cols, "shiprocket_status missing from OrderDB"
    assert "shiprocket_pickup_token" in order_cols, "shiprocket_pickup_token missing from OrderDB"
    assert "shiprocket_label_url" in order_cols, "shiprocket_label_url missing from OrderDB"
    assert "shiprocket_tracking_data" in order_cols, "shiprocket_tracking_data missing from OrderDB"
    print("  [OK] OrderDB has all required Shiprocket logistics tracking fields.")

def test_customer_address_validation():
    print("[TEST 2] Testing customer address & phone validation...")
    order = OrderDB(
        id=9999,
        full_name="Bhavesh Burad",
        customer_email="bhavesh@example.com",
        phone="9876543210",
        address_line="123 Tech Park, Phase 1",
        city="Pune",
        state="Maharashtra",
        pincode="411001",
        country="India"
    )
    
    validated = shiprocket_shipment.validate_customer_details(order)
    assert validated["phone"] == "9876543210"
    assert validated["pincode"] == "411001"
    assert validated["first_name"] == "Bhavesh"
    assert validated["last_name"] == "Burad"
    print("  [OK] Valid address successfully normalized.")

    # Test invalid phone rejection
    order.phone = "123"
    try:
        shiprocket_shipment.validate_customer_details(order)
        assert False, "Should have rejected invalid phone"
    except ValueError as e:
        print(f"  [OK] Correctly rejected invalid phone: {e}")
    order.phone = "9876543210"

    # Test invalid pincode rejection
    order.pincode = "1234"
    try:
        shiprocket_shipment.validate_customer_details(order)
        assert False, "Should have rejected invalid pincode"
    except ValueError as e:
        print(f"  [OK] Correctly rejected invalid pincode: {e}")

def test_duplicate_shipment_prevention():
    print("[TEST 3] Testing duplicate shipment prevention...")
    db = SessionLocal()
    try:
        # Create a mock order with existing shipment_id
        order = OrderDB(
            customer_email="test@tronix365.in",
            total_amount=999.0,
            status="confirmed",
            full_name="Test User",
            phone="9876543210",
            address_line="Testing Street 1",
            city="Pune",
            state="Maharashtra",
            pincode="411001",
            shiprocket_shipment_id="SR-998877",
            shiprocket_awb_code="AWB-123456"
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        try:
            shiprocket_shipment.create_shipment(order.id, db)
            assert False, "Should have rejected duplicate shipment"
        except ValueError as e:
            print(f"  [OK] Correctly prevented duplicate shipment: {e}")
            assert "already exists" in str(e)
    finally:
        # Clean up test order
        if 'order' in locals() and order.id:
            db.delete(order)
            db.commit()
        db.close()

def test_serviceability_pincode_validation():
    print("[TEST 4] Testing serviceability PIN code checks...")
    try:
        shiprocket_serviceability.validate_pincode("411001")
        print("  [OK] Valid 6-digit PIN accepted.")
    except Exception as e:
        assert False, f"Valid PIN rejected: {e}"

    try:
        shiprocket_serviceability.validate_pincode("411")
        assert False, "Should have rejected short PIN"
    except ValueError:
        print("  [OK] Short PIN correctly rejected.")

    try:
        shiprocket_serviceability.validate_pincode("41100A")
        assert False, "Should have rejected alphanumeric PIN"
    except ValueError:
        print("  [OK] Alphanumeric PIN correctly rejected.")

def run_all_tests():
    print("=" * 60)
    print("RUNNING SHIPROCKET INTEGRATION TEST SUITE")
    print("=" * 60)
    test_models_have_shipping_fields()
    test_customer_address_validation()
    test_duplicate_shipment_prevention()
    test_serviceability_pincode_validation()
    print("=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY! [OK]")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
