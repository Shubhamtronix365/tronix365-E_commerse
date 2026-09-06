import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from models import UserDB
from deps import get_current_user
from utils import process_image

router = APIRouter(tags=["Uploads"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: UserDB = Depends(get_current_user),
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

        if not os.path.exists(optimized_path):
            raise HTTPException(status_code=500, detail="Failed to process image.")

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
            return {"url": f"/uploads/{final_filename}", "media_type": "image"}
        else:
            return {"url": f"/uploads/{unique_filename}", "media_type": "video"}
    except HTTPException as he:
        raise he
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

