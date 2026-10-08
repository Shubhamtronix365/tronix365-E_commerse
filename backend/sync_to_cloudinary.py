import os
import sys
from dotenv import load_dotenv

# Force UTF-8 on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

load_dotenv()

from database import SessionLocal
from models import ProductDB
from services.media_service import is_cloudinary_enabled, upload_to_cloudinary


def sync_images_to_cloudinary():
    if not is_cloudinary_enabled():
        print("Error: Cloudinary is not configured in .env!")
        return

    db = SessionLocal()
    try:
        # Fetch all products with local uploads paths
        prods = db.query(ProductDB).filter(ProductDB.image.like("/uploads/%")).all()
        total = len(prods)
        print(f"Found {total} products with local '/uploads/' images to sync to Cloudinary.", flush=True)

        if total == 0:
            print("No local images need syncing. All images already on Cloudinary or external!", flush=True)
            return

        # Cache of local file path -> cloudinary url to avoid uploading identical files twice
        url_cache = {}
        success_count = 0
        skipped_count = 0
        failed_count = 0

        backend_dir = os.path.dirname(os.path.abspath(__file__))
        possible_dirs = [
            os.path.join(backend_dir, "uploads"),
            "uploads",
            os.path.join(backend_dir, "components"),
            "components",
        ]

        for idx, p in enumerate(prods, 1):
            fname = os.path.basename(p.image.lstrip("/"))
            local_path = None
            for d in possible_dirs:
                candidate = os.path.join(d, fname)
                if os.path.isfile(candidate):
                    local_path = candidate
                    break

            if not local_path:
                print(f"[{idx}/{total}] ⚠ File not found locally: {fname} (Skipped)", flush=True)
                skipped_count += 1
                continue

            # Check if file was already uploaded in this run
            norm_path = os.path.abspath(local_path)
            if norm_path in url_cache:
                cloud_url = url_cache[norm_path]
                p.image = cloud_url
                success_count += 1
            else:
                try:
                    cloud_url = upload_to_cloudinary(
                        local_path,
                        folder="tronix365_products",
                        resource_type="image",
                    )
                    if cloud_url:
                        url_cache[norm_path] = cloud_url
                        p.image = cloud_url
                        success_count += 1
                        print(f"[{idx}/{total}] ✓ Uploaded: {p.title[:45]} -> {cloud_url}", flush=True)
                    else:
                        print(f"[{idx}/{total}] ✗ Failed to upload: {fname}", flush=True)
                        failed_count += 1
                except Exception as upload_err:
                    print(f"[{idx}/{total}] ✗ Error uploading {fname}: {upload_err}", flush=True)
                    failed_count += 1

            if idx % 20 == 0:
                db.commit()
                print(f"--- Database progress saved [{idx}/{total}] ---", flush=True)

        db.commit()
        print(f"\n==========================================", flush=True)
        print(f"Sync complete!", flush=True)
        print(f"Successfully uploaded & updated: {success_count}", flush=True)
        print(f"Skipped (missing local file):   {skipped_count}", flush=True)
        print(f"Failed:                         {failed_count}", flush=True)
        print(f"==========================================\n", flush=True)

    except Exception as e:
        db.rollback()
        print(f"Critical error during sync: {e}", flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    sync_images_to_cloudinary()
