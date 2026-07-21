import csv
import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import ProductDB

# Ensure tables exist
Base.metadata.create_all(bind=engine)


def import_products(csv_file_path, reset=False):
    db = SessionLocal()
    try:
        if not os.path.exists(csv_file_path):
            print(f"Error: File not found at {csv_file_path}")
            return

        if reset:
            print("Reset mode enabled. Wiping products table...")
            # Check for existing orders
            from models import OrderItemDB, OrderDB, ReviewDB

            order_items_count = db.query(OrderItemDB).count()
            # Wipe reviews too just in case
            from sqlalchemy import text

            is_sqlite = db.bind.url.drivername == "sqlite"

            if is_sqlite:
                db.query(OrderItemDB).delete()
                db.query(OrderDB).delete()
                db.query(ReviewDB).delete()
                db.query(ProductDB).delete()
                # Reset SQLite sequence
                db.execute(text("DELETE FROM sqlite_sequence WHERE name='products'"))
                db.execute(text("DELETE FROM sqlite_sequence WHERE name='orders'"))
                db.execute(text("DELETE FROM sqlite_sequence WHERE name='order_items'"))
                db.execute(text("DELETE FROM sqlite_sequence WHERE name='reviews'"))
            else:
                # PostgreSQL Reset
                db.execute(
                    text(
                        "TRUNCATE TABLE order_items, orders, reviews, products RESTART IDENTITY CASCADE"
                    )
                )

            db.commit()
            print("Products and associated data wiped successfully. IDs reset to 1.\n")

        # Try common encodings to handle different CSV sources (Excel/Windows)
        encodings = ["utf-8-sig", "utf-8", "cp1252", "latin-1"]
        chosen_encoding = None

        for encoding in encodings:
            try:
                with open(csv_file_path, mode="r", encoding=encoding) as f:
                    f.read()  # Read full file to verify encoding
                chosen_encoding = encoding
                print(f"Detected encoding: {encoding}")
                break
            except (UnicodeDecodeError, PermissionError):
                continue

        if not chosen_encoding:
            chosen_encoding = "utf-8"
            print("Using fallback encoding: utf-8 (with character replacement)")

        with open(csv_file_path, mode="r", encoding=chosen_encoding, errors="replace") as csvfile:
            reader = csv.DictReader(csvfile)

            count = 0
            updated = 0

            rows = list(reader)
            print(f"Total rows to process: {len(rows)}")

            for row in rows:
                # Clean row: lower case keys, strip values
                row = {
                    str(k).strip().lower(): str(v).strip() for k, v in row.items() if k
                }

                # 1. Identity Fields
                row_id = row.get("id", "")
                skv = row.get("skv", "")
                title = row.get("title", "")

                if not any([row_id, skv, title]):
                    continue

                try:
                    # 2. Find Existing Product (ID > SKV > Title)
                    from sqlalchemy import func

                    existing_product = None
                    if row_id and row_id.isdigit():
                        existing_product = db.get(ProductDB, int(row_id))

                    if not existing_product and skv:
                        existing_product = (
                            db.query(ProductDB).filter(func.lower(ProductDB.skv) == skv.lower()).first()
                        )

                    if not existing_product and title:
                        existing_product = (
                            db.query(ProductDB).filter(func.lower(ProductDB.title) == title.lower()).first()
                        )

                    # 3. Process Image
                    image_val = row.get("image", "")
                    final_image_path = (
                        "https://placehold.co/400x400?text=No+Image"
                    )

                    if image_val:
                        if image_val.startswith("http"):
                            final_image_path = image_val
                        else:
                            # Search in components folder
                            import shutil

                            source_path = None
                            # Possible extensions in components folder
                            for ext in ["", ".jpeg", ".jpg", ".png"]:
                                test_path = os.path.join("components", image_val + ext)
                                if os.path.exists(test_path) and os.path.isfile(
                                    test_path
                                ):
                                    source_path = test_path
                                    break

                            if source_path:
                                filename = os.path.basename(source_path)
                                dest_path = os.path.join("uploads", filename)
                                os.makedirs("uploads", exist_ok=True)
                                shutil.copy2(source_path, dest_path)
                                final_image_path = f"/uploads/{filename}"
                            else:
                                if existing_product:
                                    final_image_path = existing_product.image
                                else:
                                    final_image_path = "https://placehold.co/400x400?text=No+Image"

                    # 4. Handle Updates or Creation
                    if existing_product:
                        # Only update if field is provided and NOT empty
                        if title:
                            existing_product.title = title
                        if row.get("category"):
                            existing_product.category = row["category"]
                        if row.get("description"):
                            existing_product.description = row["description"]
                        if final_image_path:
                            existing_product.image = final_image_path
                        if skv:
                            # Verify SKV is not used by another product
                            skv_owner = db.query(ProductDB).filter(func.lower(ProductDB.skv) == skv.lower()).first()
                            if not skv_owner or skv_owner.id == existing_product.id:
                                existing_product.skv = skv

                        # Resilient Numeric Parsing
                        if row.get("price"):
                            existing_product.price = clean_float(
                                row["price"], existing_product.price
                            )
                        if row.get("mrp"):
                            existing_product.mrp = clean_float(
                                row["mrp"], existing_product.mrp
                            )
                        if row.get("sale_price"):
                            existing_product.sale_price = clean_float(
                                row["sale_price"], existing_product.sale_price
                            )

                        # Default Sale Price to 200 if it's missing/0 OR if main Price is missing/0
                        if (
                            not existing_product.sale_price
                            or existing_product.sale_price == 0
                            or not existing_product.price
                            or existing_product.price == 0
                        ):
                            existing_product.sale_price = 200.0
                        # Force Stock to 100 regardless of CSV
                        existing_product.stock = 100

                        # Complex fields
                        features_raw = row.get("features")
                        if features_raw:
                            existing_product.features = parse_list(features_raw)

                        specs_raw = row.get("specs")
                        if specs_raw:
                            existing_product.specs = parse_dict(specs_raw)

                        db.commit()
                        updated += 1
                    else:
                        final_skv = skv if skv else None
                        if final_skv:
                            dup_check = db.query(ProductDB).filter(func.lower(ProductDB.skv) == final_skv.lower()).first()
                            if dup_check:
                                import uuid
                                final_skv = f"{skv}-{uuid.uuid4().hex[:4].upper()}"

                        new_product = ProductDB(
                            skv=final_skv,
                            title=title or "Unnamed Product",
                            category=row.get("category", "Uncategorized"),
                            price=clean_float(row.get("price"), 0.0),
                            mrp=clean_float(row.get("mrp"), None),
                            sale_price=clean_float(
                                row.get("sale_price"), 0.0
                            ),  # Temporary parse
                            stock=100,
                            description=row.get("description", ""),
                            image=final_image_path,
                            features=parse_list(row.get("features", "")),
                            specs=parse_dict(row.get("specs", "")),
                        )
                        # Post-init fallback check
                        if (
                            not new_product.sale_price
                            or new_product.sale_price == 0
                            or not new_product.price
                            or new_product.price == 0
                        ):
                            new_product.sale_price = 200.0

                        db.add(new_product)
                        db.commit()
                        count += 1
                        print(f"  + Created: {new_product.title}")

                except Exception as row_error:
                    db.rollback()
                    error_msg = str(row_error).split("\n")[0]  # Get first line of error
                    print(f"  ! Error on row '{title or skv}': {error_msg}")

            print(
                f"\nFinished! Created {count} new products and updated {updated} existing products."
            )

    except Exception as e:
        print(f"A critical error occurred: {e}")
    finally:
        db.close()


def clean_float(val, default):
    if not val or val == "-":
        return default
    try:
        # Regex to keep only numbers and one decimal point
        import re

        numeric_part = re.sub(r"[^\d.]", "", val)
        return float(numeric_part) if numeric_part else default
    except:
        return default


def clean_int(val, default):
    if not val or val == "-":
        return default
    try:
        import re

        numeric_part = re.sub(r"[^\d]", "", val)
        return int(numeric_part) if numeric_part else default
    except:
        return default


def parse_list(raw_str):
    if not raw_str:
        return []
    import json

    try:
        decoded = json.loads(raw_str)
        if isinstance(decoded, list):
            return [str(item).strip() for item in decoded if str(item).strip()]
    except:
        pass

    # Delimiter fallback
    delimiter = "|" if "|" in raw_str else ("," if "," in raw_str else None)
    if delimiter:
        return [f.strip() for f in raw_str.split(delimiter) if f.strip()]
    return [raw_str.strip()]


def parse_dict(raw_str):
    if not raw_str:
        return {}
    import json

    try:
        decoded = json.loads(raw_str)
        if isinstance(decoded, dict):
            return decoded
    except:
        pass

    specs_dict = {}
    items = raw_str.split("|")
    for item in items:
        if ":" in item:
            k, v = item.split(":", 1)
            specs_dict[k.strip()] = v.strip()
    return specs_dict


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Import products from a CSV file.")
    parser.add_argument("csv_file", help="Path to the CSV file")
    parser.add_argument(
        "--reset", action="store_true", help="Wipe the database before importing"
    )

    args = parser.parse_args()

    print(f"Importing from {args.csv_file}...")
    import_products(args.csv_file, reset=args.reset)
