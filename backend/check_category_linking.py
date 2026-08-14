from database import SessionLocal
from models import ProductDB, CategoryDB
from collections import Counter

def audit_categories():
    db = SessionLocal()
    try:
        products = db.query(ProductDB).all()
        categories = db.query(CategoryDB).all()

        category_names = [c.name for c in categories]
        print(f"Total categories in DB ({len(categories)}): {category_names}")
        print(f"Total products in DB: {len(products)}")

        cat_counts = Counter([p.category for p in products])
        print("\nProducts per category:")
        for cat, count in cat_counts.items():
            print(f"  - '{cat}': {count} products")

        # Check for products with None, empty, or unlisted categories
        orphaned = [p for p in products if not p.category or p.category.strip() == ""]
        if orphaned:
            print(f"\n⚠️ WARNING: Found {len(orphaned)} products with missing/empty category!")
            for p in orphaned:
                print(f"  - Product ID {p.id}: '{p.title}'")
        else:
            print("\n✅ All products have a non-empty category assigned!")

        # Check for products whose category doesn't match any CategoryDB entry
        cat_lower_map = {c.name.strip().lower(): c.name for c in categories}
        mismatched = [p for p in products if p.category and p.category.strip().lower() not in cat_lower_map]
        if mismatched:
            print(f"\n⚠️ WARNING: Found {len(mismatched)} products with category not in CategoryDB:")
            for p in mismatched:
                print(f"  - Product ID {p.id}: '{p.title}' -> Category: '{p.category}'")
        else:
            print("✅ All product categories match registered CategoryDB entries!")

    finally:
        db.close()

if __name__ == "__main__":
    audit_categories()
