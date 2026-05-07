from sqlalchemy.orm import Session
from database import SessionLocal
from models import ProductDB


def add_custom_product():
    db = SessionLocal()

    try:
        new_product = ProductDB(
            id=100,
            title="Bhavesh Edition Kit",
            description="Limited edition developer kit specially curated for Bhavesh. Includes premium components and exclusive access.",
            price=9999.0,
            category="Special Edition",
            image="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1000",
            specs={
                "Edition": "Signature Series",
                "Warranty": "Lifetime",
                "Includes": "Values & Innovation",
            },
        )

        db.add(new_product)
        db.commit()
        db.refresh(new_product)
        print(f"Successfully added product: {new_product.title} (ID: {new_product.id})")

    except Exception as e:
        print(f"Error adding product: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    add_custom_product()
