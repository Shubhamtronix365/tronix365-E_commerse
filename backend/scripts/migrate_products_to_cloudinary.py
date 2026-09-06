"""
Comprehensive CLI migration tool to upload all local images (products & blogs) to Cloudinary CDN.
Usage:
    cd backend
    python scripts/migrate_products_to_cloudinary.py
"""

import os
import sys
import re
import urllib.parse
import dotenv

# Load environment variables
dotenv.load_dotenv()
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Also check root .env
root_env = os.path.join(os.path.dirname(backend_dir), ".env")
if os.path.exists(root_env):
    dotenv.load_dotenv(root_env)

from database import SessionLocal
from models import ProductDB, BlogPostDB, UploadedMediaDB
from services.media_service import is_cloudinary_enabled, upload_to_cloudinary


def resolve_and_upload(file_reference: str, folder: str, db) -> str:
    """Helper to find the image on disk or in DB and upload to Cloudinary."""
    if not file_reference:
        return file_reference
    clean = str(file_reference).strip()
    if clean.startswith("http://") or clean.startswith("https://") or clean.startswith("data:"):
        return clean

    clean_path = clean.lstrip("/")
    if clean_path.startswith("uploads/"):
        clean_path = clean_path[len("uploads/"):]

    filename = urllib.parse.unquote(clean_path)
    raw_fname = clean_path

    local_path = os.path.join(backend_dir, "uploads", filename)
    if not os.path.exists(local_path):
        local_path = os.path.join(backend_dir, "uploads", raw_fname)

    cloud_url = None
    if os.path.exists(local_path) and os.path.isfile(local_path):
        cloud_url = upload_to_cloudinary(local_path, folder=folder, resource_type="image")
    else:
        # Check database binary storage
        media_rec = (
            db.query(UploadedMediaDB)
            .filter((UploadedMediaDB.filename == filename) | (UploadedMediaDB.filename == raw_fname))
            .first()
        )
        if media_rec and media_rec.data:
            cloud_url = upload_to_cloudinary(media_rec.data, folder=folder, resource_type="image")

    return cloud_url or file_reference


def migrate_all():
    print("=" * 65)
    print("  Tronix365 Full Media Migration to Cloudinary CDN")
    print("=" * 65)

    if not is_cloudinary_enabled():
        print("\n[ERROR] Cloudinary is NOT configured!")
        print("Please ensure CLOUDINARY_URL is set in backend/.env or your environment.")
        return

    db = SessionLocal()
    try:
        # ----------------------------------------------------
        # 1. MIGRATE PRODUCT IMAGES
        # ----------------------------------------------------
        print("\n>>> Phase 1: Migrating Products...")
        products = db.query(ProductDB).all()
        to_migrate_prods = [
            p for p in products 
            if p.image and not str(p.image).strip().startswith(("http://", "https://"))
        ]
        print(f"Total Products: {len(products)} | Pending Local Products: {len(to_migrate_prods)}")

        prod_success = 0
        prod_fail = 0

        for idx, p in enumerate(to_migrate_prods, start=1):
            original = p.image
            cloud_url = resolve_and_upload(original, folder="tronix365_products", db=db)
            if cloud_url and cloud_url != original and cloud_url.startswith("http"):
                p.image = cloud_url
                prod_success += 1
                print(f"[{idx}/{len(to_migrate_prods)}] Product #{p.id} ({p.title[:25]}...): SUCCESS")
            else:
                prod_fail += 1
                print(f"[{idx}/{len(to_migrate_prods)}] Product #{p.id} ({p.title[:25]}...): File not found locally ({original})")

            if idx % 10 == 0:
                db.commit()

        db.commit()
        print(f"Products Phase Complete: {prod_success} uploaded, {prod_fail} skipped.")

        # ----------------------------------------------------
        # 2. MIGRATE BLOG POSTS (Cover, Avatar, Body Media)
        # ----------------------------------------------------
        print("\n>>> Phase 2: Migrating Blog Posts...")
        posts = db.query(BlogPostDB).all()
        blog_updates = 0

        for b in posts:
            changed = False
            # 2a. Cover image
            if b.cover_image and not str(b.cover_image).strip().startswith(("http://", "https://")):
                new_cover = resolve_and_upload(b.cover_image, folder="tronix365_blogs", db=db)
                if new_cover and new_cover.startswith("http"):
                    b.cover_image = new_cover
                    changed = True
                    print(f"Blog #{b.id} cover -> {new_cover}")

            # 2b. Author avatar
            if b.author_avatar and not str(b.author_avatar).strip().startswith(("http://", "https://")):
                new_avatar = resolve_and_upload(b.author_avatar, folder="tronix365_blogs", db=db)
                if new_avatar and new_avatar.startswith("http"):
                    b.author_avatar = new_avatar
                    changed = True
                    print(f"Blog #{b.id} avatar -> {new_avatar}")

            # 2c. In-article content media tags
            if b.content and "/uploads/" in b.content:
                # Find all /uploads/... instances
                matches = re.findall(r'(/uploads/[^"\'\s>]+)', b.content)
                new_content = b.content
                for m in set(matches):
                    c_url = resolve_and_upload(m, folder="tronix365_blogs", db=db)
                    if c_url and c_url.startswith("http"):
                        new_content = new_content.replace(m, c_url)
                        changed = True
                        print(f"Blog #{b.id} in-content media {m} -> {c_url}")
                b.content = new_content

            if changed:
                blog_updates += 1

        db.commit()
        print(f"Blog Phase Complete: {blog_updates} blog posts upgraded to Cloudinary.")

        print("\n" + "=" * 65)
        print("[SUCCESS] ALL MIGRATIONS COMPLETED SUCCESSFULLY!")
        print(f"- Total Products on Cloudinary: {prod_success}")
        print(f"- Total Blogs Upgraded:         {blog_updates}")
        print("=" * 65)

    except Exception as e:
        db.rollback()
        print(f"\n[FATAL ERROR] Migration failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate_all()
