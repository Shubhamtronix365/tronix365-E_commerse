from database import SessionLocal
from models import ProductDB

def update_product_prices():
    db = SessionLocal()
    try:
        # Find products with price of 0 or 1 Rs (or <= 1.0)
        products = db.query(ProductDB).filter(ProductDB.price <= 1.0).all()
        print(f"Found {len(products)} products with base price <= 1 Rs.")

        updated_count = 0
        for product in products:
            print(f"Updating: ID={product.id}, Title='{product.title}', Old Price={product.price} Rs -> New Price=50.0 Rs")
            product.price = 50.0
            updated_count += 1

        if updated_count > 0:
            db.commit()
            print(f"Successfully updated {updated_count} products to 50 Rs.")
        else:
            print("No products needed updating.")
            
    except Exception as e:
        db.rollback()
        print(f"Error updating product prices: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_product_prices()
