import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import UserDB, UploadedMediaDB
from deps import get_current_user
from utils import process_image
from services.media_service import upload_to_cloudinary, save_media_to_db, is_cloudinary_enabled

router = APIRouter(tags=["Uploads"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Check file extension against whitelist
    filename = file.filename or ""
    file_extension = filename.split(".")[-1].lower()
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Invalid file extension. Only images (JPG, PNG, WEBP, GIF) are allowed."
        )

    # 2. Check file size (5MB limit)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds maximum limit of 5MB."
        )

    unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.urandom(4).hex()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)

        # 3. Validate image content via Pillow
        from PIL import Image
        try:
            with Image.open(file_path) as img:
                img.verify()
        except Exception:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=400, detail="Invalid or corrupt image file.")

        # Optimize image and convert to WebP
        optimized_path = process_image(file_path)
        final_filename = os.path.basename(optimized_path)

        # 1. Cloudinary CDN Upload (if CLOUDINARY_URL is configured)
        cloud_url = upload_to_cloudinary(optimized_path, folder="tronix365_products", resource_type="image")

        # 2. Persist bytes in database for lifetime persistence across Render container restarts
        try:
            with open(optimized_path, "rb") as f:
                img_data = f.read()
            save_media_to_db(db, final_filename, img_data, "image/webp")
        except Exception as err:
            print(f"Warning: Failed to read image for database backup: {err}")

        if cloud_url:
            return {"url": cloud_url, "provider": "cloudinary"}

        return {"url": f"/uploads/{final_filename}"}
    except HTTPException as he:
        raise he
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/media")
async def upload_media_file(
    file: UploadFile = File(...),
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Controlled upload for blog media: images (auto WebP, max 10MB) and videos (MP4/WebM, max 30MB)."""
    filename = file.filename or ""
    file_extension = filename.split(".")[-1].lower() if "." in filename else ""
    IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "gif"}
    VIDEO_EXTS = {"mp4", "webm"}

    if file_extension not in (IMAGE_EXTS | VIDEO_EXTS):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only images (JPG, PNG, WEBP, GIF) and videos (MP4, WEBM) are permitted."
        )

    contents = await file.read()
    max_size = 30 * 1024 * 1024 if file_extension in VIDEO_EXTS else 10 * 1024 * 1024
    if len(contents) > max_size:
        size_mb = 30 if file_extension in VIDEO_EXTS else 10
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowable limit of {size_mb}MB."
        )

    unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.urandom(4).hex()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)

        if file_extension in IMAGE_EXTS:
            from PIL import Image
            try:
                with Image.open(file_path) as img:
                    img.verify()
            except Exception:
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise HTTPException(status_code=400, detail="Corrupt or invalid image file.")

            optimized_path = process_image(file_path)
            final_filename = os.path.basename(optimized_path)

            # Cloudinary CDN Upload
            cloud_url = upload_to_cloudinary(optimized_path, folder="tronix365_blogs", resource_type="image")

            # Persist to DB
            try:
                with open(optimized_path, "rb") as f:
                    img_data = f.read()
                save_media_to_db(db, final_filename, img_data, "image/webp")
            except Exception as err:
                print(f"Warning: Failed to save uploaded image to database: {err}")

            if cloud_url:
                return {"url": cloud_url, "media_type": "image", "provider": "cloudinary"}

            return {"url": f"/uploads/{final_filename}", "media_type": "image"}
        else:
            # Video file
            cloud_url = upload_to_cloudinary(file_path, folder="tronix365_blogs", resource_type="video")

            try:
                with open(file_path, "rb") as f:
                    vid_data = f.read()
                mime = "video/mp4" if file_extension == "mp4" else "video/webm"
                save_media_to_db(db, unique_filename, vid_data, mime)
            except Exception as err:
                print(f"Warning: Failed to save video to database: {err}")

            if cloud_url:
                return {"url": cloud_url, "media_type": "video", "provider": "cloudinary"}

            return {"url": f"/uploads/{unique_filename}", "media_type": "video"}
    except HTTPException as he:
        raise he
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

