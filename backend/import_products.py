import csv
import sys
import os

# Force UTF-8 on Windows console to prevent charmap UnicodeEncodeError
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def log(msg):
    try:
        print(msg)
    except Exception:
        try:
            print(str(msg).encode("ascii", "replace").decode("ascii"))
        except Exception:
            pass

# Increase CSV field size limit for large descriptions/specs
try:
    csv.field_size_limit(sys.maxsize)
except OverflowError:
    csv.field_size_limit(2147483647)

from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import ProductDB

# Ensure tables exist
Base.metadata.create_all(bind=engine)


def load_records_from_file(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    if ext in [".xlsx", ".xlsm"]:
        import openpyxl

        wb = openpyxl.load_workbook(file_path, data_only=True)
        records = []
        for sheet in wb.worksheets:
            rows_iter = sheet.iter_rows(values_only=True)
            try:
                header_row = next(rows_iter)
            except StopIteration:
                continue

            headers = [
                str(cell).strip().lower() if cell is not None else ""
                for cell in header_row
            ]
            for row in rows_iter:
                if not any(
                    cell is not None and str(cell).strip() != "" for cell in row
                ):
                    continue
                record = {}
                for h, cell in zip(headers, row):
                    if h:
                        if cell is None:
                            val = ""
                        elif isinstance(cell, float) and cell.is_integer():
                            val = str(int(cell))
                        else:
                            val = str(cell).strip()
                        record[h] = val
                title_val = record.get("title", "").strip().lower()
                if title_val and title_val != "title":
                    records.append(record)
        return records

    else:
        # CSV Handling
        encodings = ["utf-8-sig", "utf-8", "cp1252", "latin-1"]
        chosen_encoding = None

        for encoding in encodings:
            try:
                with open(file_path, mode="r", encoding=encoding) as f:
                    f.read()
                chosen_encoding = encoding
                print(f"Detected encoding: {encoding}")
                break
            except (UnicodeDecodeError, PermissionError):
                continue

        if not chosen_encoding:
            chosen_encoding = "utf-8"
            print("Using fallback encoding: utf-8 (with character replacement)")

        with open(
            file_path, mode="r", encoding=chosen_encoding, errors="replace"
        ) as csvfile:
            reader = csv.DictReader(csvfile)
            records = []
            for row in reader:
                record = {
                    str(k).strip().lower(): str(v).strip()
                    for k, v in row.items()
                    if k
                }
                records.append(record)
            return records


def resolve_image_search_dirs(custom_dir=None):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = []
    if custom_dir:
        candidates.append(custom_dir)
        candidates.append(os.path.join(base_dir, custom_dir))

    candidates.extend(
        [
            os.path.join(base_dir, "components"),
            "components",
            os.path.join(base_dir, "new_components"),
            "new_components",
            os.path.join(base_dir, "product_images"),
            "product_images",
            os.path.join(base_dir, "images"),
            "images",
        ]
    )
    seen = set()
    valid_dirs = []
    for d in candidates:
        if d and os.path.isdir(d):
            norm = os.path.normpath(os.path.abspath(d))
            if norm not in seen:
                seen.add(norm)
                valid_dirs.append(d)
    return valid_dirs


def build_image_index(search_dirs):
    index = {}  # lowercase candidate name -> full file path
    for folder in search_dirs:
        if not folder or not os.path.isdir(folder):
            continue
        try:
            for f in os.listdir(folder):
                full_p = os.path.join(folder, f)
                if os.path.isfile(full_p):
                    cleaned = f.lower().strip()
                    if cleaned not in index:
                        index[cleaned] = full_p
        except Exception:
            continue
    return index


def find_image_indexed(image_val, title, image_index):
    candidates = []
    if image_val:
        cleaned_img = image_val.lower().strip()
        candidates.append(cleaned_img)
        for ext in [".jpg", ".jpeg", ".png", ".webp", ".svg"]:
            candidates.append(cleaned_img + ext)
    if title:
        cleaned_title = title.lower().strip()
        candidates.append(cleaned_title)
        for ext in [".jpg", ".jpeg", ".png", ".webp", ".svg"]:
            candidates.append(cleaned_title + ext)

    for cand in candidates:
        if cand in image_index:
            return image_index[cand]
    return None


def find_default_data_file():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        "products.xlsx",
        os.path.join(backend_dir, "products.xlsx"),
        "products.csv",
        os.path.join(backend_dir, "products.csv"),
        os.path.join(backend_dir, "data", "products.csv"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None


def import_products(csv_file_path, reset=False, images_dir=None):
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

        # Load rows from file (.xlsx or .csv)
        rows = load_records_from_file(csv_file_path)
        log(f"Total rows to process: {len(rows)}")

        # High-Speed In-Memory Preload
        log("Pre-fetching existing products from database...")
        existing_products = db.query(ProductDB).all()
        by_id = {p.id: p for p in existing_products if p.id}
        by_skv = {p.skv.lower(): p for p in existing_products if p.skv}
        by_title = {p.title.lower(): p for p in existing_products if p.title}
        used_skvs = set(by_skv.keys())
        log(f"Cached {len(existing_products)} existing database products.")

        search_dirs = resolve_image_search_dirs(images_dir)
        image_index = build_image_index(search_dirs)
        log(f"Indexed {len(image_index)} component images.")

        backend_dir = os.path.dirname(os.path.abspath(__file__))
        backend_uploads = os.path.join(backend_dir, "uploads")
        os.makedirs(backend_uploads, exist_ok=True)
        is_diff_uploads = os.path.abspath("uploads") != os.path.abspath(backend_uploads)
        if is_diff_uploads:
            os.makedirs("uploads", exist_ok=True)

        count = 0
        updated = 0
        batch_count = 0

        for idx, row in enumerate(rows, 1):
            # 1. Identity Fields
            row_id = row.get("id", "")
            skv = (
                row.get("skv", "")
                or row.get("sku", "")
                or row.get("mpn", "")
            )
            if str(skv).strip().lower() in [".", "-", "none", "null", "n/a", "na"]:
                skv = ""

            title = row.get("title", "").strip()

            if not any([row_id, skv, title]):
                continue

            try:
                # 2. Fast In-Memory Lookup (ID > SKV > Title)
                existing_product = None
                if row_id and str(row_id).isdigit() and int(row_id) in by_id:
                    existing_product = by_id[int(row_id)]

                if not existing_product and skv and skv.lower() in by_skv:
                    existing_product = by_skv[skv.lower()]

                if not existing_product and title and title.lower() in by_title:
                    existing_product = by_title[title.lower()]

                # 3. Fast Indexed Image Lookup
                image_val = row.get("image", "").strip()
                final_image_path = "https://placehold.co/400x400?text=No+Image"

                if image_val and image_val.startswith("http"):
                    final_image_path = image_val
                else:
                    import shutil

                    source_path = find_image_indexed(image_val, title, image_index)

                    if source_path:
                        filename = os.path.basename(source_path)
                        dest_path = os.path.join(backend_uploads, filename)
                        if not os.path.exists(dest_path):
                            shutil.copy2(source_path, dest_path)
                            if is_diff_uploads:
                                shutil.copy2(source_path, os.path.join("uploads", filename))

                        final_image_path = f"/uploads/{filename}"
                    else:
                        if existing_product and existing_product.image and "placehold" not in existing_product.image:
                            final_image_path = existing_product.image
                        else:
                            final_image_path = "https://placehold.co/400x400?text=No+Image"

                # 4. Numeric Price Parsing
                raw_sale_price = (
                    row.get("sales price")
                    or row.get("sale_price")
                    or row.get("price")
                    or row.get("selling price10%")
                    or row.get("base price")
                )
                raw_price = (
                    row.get("price")
                    or row.get("sales price")
                    or row.get("sale_price")
                    or row.get("selling price10%")
                    or raw_sale_price
                )
                raw_mrp = row.get("mrp") or row.get("r mrp")

                is_pending = False
                if not raw_sale_price or str(raw_sale_price).strip() in ["", "0", "0.0", "-", "nan", "None"]:
                    is_pending = True

                parsed_sale = clean_float(raw_sale_price, 200.0)
                parsed_pr = clean_float(raw_price, parsed_sale)
                if parsed_sale <= 0 and parsed_pr > 0:
                    parsed_sale = parsed_pr
                if parsed_pr <= 0 and parsed_sale > 0:
                    parsed_pr = parsed_sale

                parsed_m = clean_float(raw_mrp, None)
                if parsed_m is None or parsed_m < parsed_sale:
                    parsed_m = round(parsed_sale * 1.3, 2)

                specs_raw = row.get("specs") or row.get("specifications")
                features_raw = row.get("features")

                # 5. Handle Updates or Creation
                if existing_product:
                    if title:
                        existing_product.title = title
                    if row.get("category"):
                        existing_product.category = row["category"]
                    if row.get("description"):
                        existing_product.description = row["description"]
                    if final_image_path:
                        existing_product.image = final_image_path
                    if skv:
                        skv_lower = skv.lower()
                        if skv_lower not in used_skvs or (existing_product.skv and existing_product.skv.lower() == skv_lower):
                            existing_product.skv = skv
                            used_skvs.add(skv_lower)

                    existing_product.price = parsed_pr
                    existing_product.sale_price = parsed_sale
                    existing_product.mrp = parsed_m
                    existing_product.is_price_pending = is_pending
                    existing_product.stock = 100

                    if features_raw:
                        existing_product.features = parse_list(features_raw)
                    if specs_raw:
                        existing_product.specs = parse_dict(specs_raw)

                    updated += 1
                else:
                    final_skv = skv if skv else None
                    if final_skv:
                        if final_skv.lower() in used_skvs:
                            import uuid
                            final_skv = f"{skv}-{uuid.uuid4().hex[:4].upper()}"
                        used_skvs.add(final_skv.lower())
                    else:
                        import re, uuid
                        slug_prefix = re.sub(r'[^A-Za-z0-9]', '', title)[:8].upper() or "PROD"
                        final_skv = f"SKV-{slug_prefix}-{uuid.uuid4().hex[:4].upper()}"
                        used_skvs.add(final_skv.lower())

                    new_product = ProductDB(
                        skv=final_skv,
                        title=title or "Unnamed Product",
                        category=row.get("category", "Uncategorized"),
                        price=parsed_pr,
                        mrp=parsed_m,
                        sale_price=parsed_sale,
                        is_price_pending=is_pending,
                        stock=100,
                        description=row.get("description", ""),
                        image=final_image_path,
                        features=parse_list(features_raw or ""),
                        specs=parse_dict(specs_raw or ""),
                    )

                    db.add(new_product)
                    if title:
                        by_title[title.lower()] = new_product
                    if final_skv:
                        by_skv[final_skv.lower()] = new_product
                    count += 1

                batch_count += 1
                if batch_count >= 50:
                    db.commit()
                    batch_count = 0
                    log(f"Progress: [{idx}/{len(rows)}] processed...")

            except Exception as row_error:
                db.rollback()
                error_msg = str(row_error).split("\n")[0]
                log(f"  ! Error on row '{title or skv}': {error_msg}")

        # Final batch commit
        db.commit()
        log(
            f"\nFinished! Created {count} new products and updated {updated} existing products."
        )

    except Exception as e:
        log(f"A critical error occurred: {e}")
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

    parser = argparse.ArgumentParser(
        description="Import products from a CSV or Excel (.xlsx) file."
    )
    parser.add_argument(
        "file_path",
        nargs="?",
        default=None,
        help="Path to CSV or Excel file (optional; auto-detects products.xlsx or products.csv)",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe the database before importing (IDs reset to 1)",
    )
    parser.add_argument(
        "--images-dir",
        "-i",
        default=None,
        help="Custom folder containing component images (defaults to components/)",
    )

    args = parser.parse_args()

    target_file = args.file_path
    if not target_file:
        target_file = find_default_data_file()
        if not target_file:
            print("Error: No file provided and could not find products.xlsx or products.csv.")
            print("Usage: python import_products.py [products.xlsx|products.csv] [--reset] [--images-dir <folder>]")
            sys.exit(1)

    print(f"Importing products from: {target_file}")
    import_products(target_file, reset=args.reset, images_dir=args.images_dir)
