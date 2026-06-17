from database import SessionLocal
from models import ProductDB

import csv
import os
import re

def update_product_prices():
    csv_path = r"c:\Users\Hi\Desktop\tronix365-E_commerse\backend\data\products.csv"
    
    # 1. Update the CSV source file
    if os.path.exists(csv_path):
        print("Updating CSV source file...")
        updated_rows = []
        csv_updated_count = 0
        
        # Read the existing CSV
        with open(csv_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            rows = list(reader)
            
            for row in rows:
                price_str = row.get("price", "0").strip()
                numeric_part = re.sub(r"[^\d.]", "", price_str)
                try:
                    price_val = float(numeric_part) if numeric_part else 0.0
                except ValueError:
                    price_val = 0.0
                
                # Check if price is 0 or 1 (or empty/invalid)
                if price_val <= 1.0:
                    row["price"] = "50"
                    csv_updated_count += 1
                updated_rows.append(row)
        
        # Write back to CSV
        with open(csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(updated_rows)
            
        print(f"Successfully updated {csv_updated_count} products in products.csv to 50 Rs.")
    else:
        print(f"Warning: CSV file not found at {csv_path}")

    # 2. Update the Database
    db = SessionLocal()
    try:
        # Find products with price of 0 or 1 Rs (or <= 1.0 or None)
        products = db.query(ProductDB).filter((ProductDB.price <= 1.0) | (ProductDB.price.is_(None))).all()
        print(f"Found {len(products)} products in DB with base price <= 1 Rs (or NULL).")

        updated_count = 0
        for product in products:
            product.price = 50.0
            updated_count += 1

        if updated_count > 0:
            db.commit()
            print(f"Successfully updated {updated_count} products in DB to 50 Rs.")
        else:
            print("No products needed updating in DB.")
            
    except Exception as e:
        db.rollback()
        print(f"Error updating product prices in DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_product_prices()

