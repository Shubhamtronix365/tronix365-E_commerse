"""
Standalone CLI tool to migrate local product images to Cloudinary CDN for lifetime hosting.
Usage:
    cd backend
    python scripts/migrate_products_to_cloudinary.py
"""

import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import SessionLocal
from models import ProductDB, UploadedMediaDB
from services.media_service import is_cloudinary_enabled, upload_to_cloudinary


def migrate_products():
    print("=" * 60)
    print("  Tronix365 Cloudinary Product Image Migration Utility")
    print("=" * 60)

    if not is_cloudinary_enabled():
        print("\n[ERROR] Cloudinary is NOT configured!")
        print("Please set your CLOUDINARY_URL environment variable first, e.g.:")
        print("  Windows CMD:        set CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME")
        print("  Windows PowerShell: $env:CLOUDINARY_URL='cloudinary://API_KEY:API_SECRET@CLOUD_NAME'")
        print("  Render Dashboard:   Environment -> Add Variable -> CLOUDINARY_URL")
        print("\nExiting without making any changes.")
        return

    db = SessionLocal()
    try:
        products = db.query(ProductDB).all()
        total_products = len(products)
        print(f"\nFound {total_products} products in database.")

        to_migrate = []
        already_cdn = 0
        no_image = 0

        for p in products:
            if not p.image:
                no_image += 1
                continue
            img_str = str(p.image).strip()
            if img_str.startswith("http://") or img_str.startswith("https://"):
                already_cdn += 1
                continue
            to_migrate.append(p)

        print(f"- Already on Cloud/CDN: {already_cdn}")
        print(f"- No image set:         {no_image}")
        print(f"- Pending migration:    {len(to_migrate)}")

        if not to_migrate:
            print("\nAll product images are already on Cloud/CDN! Nothing to migrate.")
            return

        success_count = 0
        failed_count = 0

        print("\nStarting upload to Cloudinary...")
        for idx, p in enumerate(to_migrate, start=1):
            clean_path = str(p.image).strip().lstrip("/")
            filename = os.path.basename(clean_path)
            local_path = os.path.join(backend_dir, "uploads", filename)

            cloud_url = None
            if os.path.exists(local_path):
                cloud_url = upload_to_cloudinary(
                    local_path,
                    folder="tronix365_products",
                    resource_type="image",
                )
            else:
                # Attempt to retrieve binary from UploadedMediaDB
                media_rec = db.query(UploadedMediaDB).filter(UploadedMediaDB.filename == filename).first()
                if media_rec and media_rec.data:
                    cloud_url = upload_to_cloudinary(
                        media_rec.data,
                        folder="tronix365_products",
                        resource_type="image",
                    )

            if cloud_url:
                p.image = cloud_url
                success_count += 1
                print(f"[{idx}/{len(to_migrate)}] SUCCESS: Product #{p.id} ({p.title[:30]}) -> {cloud_url}")
            else:
                failed_count += 1
                print(f"[{idx}/{len(to_migrate)}] SKIPPED/FAILED: Product #{p.id} (File not found on disk or in DB: {filename})")

            # Commit batch every 20 items
            if idx % 20 == 0:
                db.commit()

        db.commit()
        print("\n" + "=" * 60)
        print(f"Migration completed successfully!")
        print(f"- Successfully uploaded to Cloudinary: {success_count}")
        print(f"- Failed or missing local files:       {failed_count}")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n[FATAL ERROR] Migration failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate_products()
