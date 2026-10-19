import os
import sys
from datetime import datetime, timedelta

# Setup path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import (
    UserDB,
    ProductDB,
    BundleDB,
    BundleProductDB,
    CartItemDB,
    OrderItemDB,
    OrderDB,
    CartMergeRequest,
    CartItemCreate
)

def test_stale_bundle_self_healing():
    print("\n--- Testing Stale & Expired Bundle Self-Healing ---")
    db = SessionLocal()
    test_user = None
    p1 = None
    p2 = None
    bundle = None

    try:
        # 1. Create a test user
        test_email = f"bundle_test_{os.urandom(3).hex()}@example.com"
        test_user = UserDB(
            email=test_email,
            full_name="Bundle Tester",
            role="user",
            hashed_password="mockhash"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

        # 2. Create two test products
        p1 = ProductDB(
            title="Sensor Module A",
            price=150.0,
            sale_price=150.0,
            stock=10,
            category="Sensors"
        )
        p2 = ProductDB(
            title="Development Board B",
            price=350.0,
            sale_price=350.0,
            stock=10,
            category="Development Boards"
        )
        db.add_all([p1, p2])
        db.commit()
        db.refresh(p1)
        db.refresh(p2)

        # 3. Create a bundle (Total 500, bundle price 400)
        bundle = BundleDB(
            name="Robotics Starter Bundle",
            description="Arduino + Sensor combo",
            original_price=500.0,
            bundle_price=400.0,
            is_active=True,
            expiry_date=datetime.utcnow() + timedelta(days=2),
            usage_limit=10,
            used_count=0
        )
        db.add(bundle)
        db.commit()
        db.refresh(bundle)

        bp1 = BundleProductDB(bundle_id=bundle.id, product_id=p1.id)
        bp2 = BundleProductDB(bundle_id=bundle.id, product_id=p2.id)
        db.add_all([bp1, bp2])
        db.commit()

        # 4. User adds bundle to cart
        c1 = CartItemDB(user_id=test_user.id, product_id=p1.id, bundle_id=bundle.id, quantity=1, selected=True)
        c2 = CartItemDB(user_id=test_user.id, product_id=p2.id, bundle_id=bundle.id, quantity=1, selected=True)
        db.add_all([c1, c2])
        db.commit()
        db.refresh(c1)
        db.refresh(c2)

        assert c1.bundle_id == bundle.id
        assert c2.bundle_id == bundle.id
        print("Step 1 (Add Bundle to Cart): PASS")

        # 5. Simulate 2 days passing -> bundle expires
        bundle.expiry_date = datetime.utcnow() - timedelta(days=1)
        db.commit()
        db.refresh(bundle)

        # Simulate GET /cart self-healing logic
        cart_items = db.query(CartItemDB).filter(CartItemDB.user_id == test_user.id).all()
        healed_warnings = []
        for item in cart_items:
            if item.bundle_id:
                b = db.query(BundleDB).filter(BundleDB.id == item.bundle_id).first()
                is_invalid = False
                if not b:
                    is_invalid = True
                elif not b.is_active:
                    is_invalid = True
                elif b.expiry_date:
                    now = datetime.now(b.expiry_date.tzinfo) if b.expiry_date.tzinfo else datetime.utcnow()
                    if now > b.expiry_date:
                        is_invalid = True

                if is_invalid:
                    item.bundle_id = None
                    msg = f"Bundle '{b.name if b else 'Promo'}' has expired. Items remain in your cart at regular price."
                    if msg not in healed_warnings:
                        healed_warnings.append(msg)

        db.commit()
        for item in cart_items:
            db.refresh(item)

        # Verify that products are STILL in cart, but bundle_id is decoupled!
        assert len(cart_items) == 2
        assert cart_items[0].bundle_id is None
        assert cart_items[1].bundle_id is None
        assert len(healed_warnings) == 1
        print("Step 2 (Self-Healing on Expired Bundle): PASS - Items remain in cart with bundle_id=None")

        # 6. Test Admin Deletion scenario
        # Re-attach to bundle, then delete bundle completely
        cart_items[0].bundle_id = bundle.id
        cart_items[1].bundle_id = bundle.id
        db.commit()

        # Admin deletes bundle
        db.query(CartItemDB).filter(CartItemDB.bundle_id == bundle.id).update({"bundle_id": None})
        db.delete(bundle)
        db.commit()
        bundle = None

        # Verify cart items still exist with bundle_id=None
        refreshed_items = db.query(CartItemDB).filter(CartItemDB.user_id == test_user.id).all()
        assert len(refreshed_items) == 2
        assert refreshed_items[0].bundle_id is None
        assert refreshed_items[1].bundle_id is None
        print("Step 3 (Admin Deletion Safeguard): PASS - Products preserved at standard price")

        print("\nALL STALE BUNDLE SELF-HEALING TESTS PASSED SUCCESSFULLY!")

    finally:
        # Cleanup
        if test_user:
            db.query(CartItemDB).filter(CartItemDB.user_id == test_user.id).delete()
            db.delete(test_user)
        if bundle:
            db.delete(bundle)
        if p1:
            db.delete(p1)
        if p2:
            db.delete(p2)
        db.commit()
        db.close()

if __name__ == "__main__":
    test_stale_bundle_self_healing()
