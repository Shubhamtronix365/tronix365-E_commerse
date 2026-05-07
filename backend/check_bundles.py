from database import SessionLocal
from models import BundleDB, ProductDB, BundleProductDB


def check_and_create_bundle():
    db = SessionLocal()
    try:
        bundles = db.query(BundleDB).all()
        if bundles:
            print(f"Found {len(bundles)} bundles.")
            for b in bundles:
                print(f"- {b.name} (ID: {b.id})")
        else:
            print("No bundles found. Creating a sample bundle...")
            # Get first two products
            products = db.query(ProductDB).limit(2).all()
            if len(products) < 2:
                print("Not enough products to create a bundle.")
                return

            new_bundle = BundleDB(
                name="Starter Pack",
                description="Get started with these two essential items!",
                original_price=products[0].price + products[1].price,
                bundle_price=(products[0].price + products[1].price)
                * 0.8,  # 20% discount
                is_active=True,
            )
            db.add(new_bundle)
            db.commit()
            db.refresh(new_bundle)

            for p in products:
                bp = BundleProductDB(bundle_id=new_bundle.id, product_id=p.id)
                db.add(bp)

            db.commit()
            print(
                f"Created bundle: {new_bundle.name} (ID: {new_bundle.id}) for products {[p.title for p in products]}"
            )

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    check_and_create_bundle()
