from database import SessionLocal
from models import ProductDB
import re

def find_templated_products():
    db = SessionLocal()
    try:
        products = db.query(ProductDB).all()
        print(f"Total products in DB: {len(products)}")

        templated = []
        pattern = re.compile(r'is a professional-grade', re.IGNORECASE)

        for p in products:
            desc = p.description or ""
            if pattern.search(desc):
                templated.append(p)

        print(f"\nFound {len(templated)} products with the template description pattern!")
        print("="*80)
        for p in templated[:20]:
            print(f"ID {p.id}: {p.title} ({p.category})")
            print(f"   Current Desc: {p.description[:100]}...\n")
        
        if len(templated) > 20:
            print(f"... and {len(templated) - 20} more products.")

    finally:
        db.close()

if __name__ == "__main__":
    find_templated_products()
