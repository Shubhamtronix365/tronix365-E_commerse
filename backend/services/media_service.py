import os
import logging
from typing import Optional
from sqlalchemy.orm import Session
from models import UploadedMediaDB

logger = logging.getLogger(__name__)

# High-availability CDN fallback that responds in < 20ms and never times out in Gmail/Outlook
DEFAULT_CDN_LOGO_URL = "https://cdn.jsdelivr.net/gh/bhaveshburad729/tronix365-E_commerse@main/public/logo.png"
_CACHED_LOGO_URL: Optional[str] = None


def is_cloudinary_enabled() -> bool:
    """Check if Cloudinary environment credentials are configured."""
    has_env = bool(os.getenv("CLOUDINARY_URL") or os.getenv("CLOUDINARY_CLOUD_NAME"))
    if not has_env:
        return False
    try:
        import cloudinary
        import cloudinary.uploader
        return True
    except ImportError:
        logger.warning("Cloudinary library not installed. Using database fallback.")
        return False


def upload_to_cloudinary(
    file_path_or_bytes,
    folder: str = "tronix365_uploads",
    resource_type: str = "image",
    public_id: Optional[str] = None,
    overwrite: bool = True,
) -> Optional[str]:
    """
    Upload an image or video to Cloudinary.
    Returns the secure HTTPS CDN URL, or None if Cloudinary is not configured/failed.
    """
    if not is_cloudinary_enabled():
        return None

    import time
    for attempt in range(1, 4):
        try:
            import cloudinary.uploader

            upload_params = {
                "folder": folder,
                "resource_type": resource_type,
                "overwrite": overwrite,
            }
            if public_id:
                upload_params["public_id"] = public_id

            res = cloudinary.uploader.upload(file_path_or_bytes, **upload_params)
            secure_url = res.get("secure_url")
            if secure_url:
                logger.info(f"Cloudinary upload successful: {secure_url}")
                return secure_url
        except Exception as e:
            err_str = str(e).lower()
            if "slow down" in err_str or "capacity" in err_str or "rate" in err_str:
                logger.warning(f"Cloudinary rate limit hit, backing off for {attempt * 2}s (attempt {attempt}/3)...")
                time.sleep(attempt * 2)
            else:
                logger.error(f"Cloudinary upload failed: {e}")
                break

    return None


def get_email_logo_url() -> str:
    """
    Get the permanent, high-availability HTTPS URL for the Tronix365 logo in emails.
    Prevents Gmail and Outlook image proxy timeouts (which happen when Render is cold).
    Priority:
    1. Custom EMAIL_LOGO_URL environment variable
    2. Cloudinary CDN URL (auto-uploaded to Cloudinary if configured)
    3. High-availability jsDelivr CDN (100% uptime, instant response)
    """
    global _CACHED_LOGO_URL
    if _CACHED_LOGO_URL:
        return _CACHED_LOGO_URL

    # 1. Explicit override from env
    env_url = os.getenv("EMAIL_LOGO_URL")
    if env_url and env_url.strip():
        _CACHED_LOGO_URL = env_url.strip()
        return _CACHED_LOGO_URL

    # 2. Cloudinary CDN if active
    if is_cloudinary_enabled():
        try:
            # Check local file
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            local_logo = os.path.join(backend_dir, "email_assets", "logo.png")
            if not os.path.exists(local_logo):
                local_logo = os.path.join(backend_dir, "public", "logo.png")

            if os.path.exists(local_logo):
                c_url = upload_to_cloudinary(
                    local_logo,
                    folder="tronix365_brand",
                    public_id="logo",
                    resource_type="image",
                    overwrite=False,
                )
                if c_url:
                    _CACHED_LOGO_URL = c_url
                    return _CACHED_LOGO_URL
        except Exception as e:
            logger.warning(f"Failed to auto-upload logo to Cloudinary: {e}")

    # 3. High-availability jsDelivr CDN
    _CACHED_LOGO_URL = DEFAULT_CDN_LOGO_URL
    return _CACHED_LOGO_URL


def save_media_to_db(
    db: Session,
    filename: str,
    data: bytes,
    mime_type: str = "image/webp",
) -> None:
    """Safely persist media bytes in the PostgreSQL database as a self-healing fallback."""
    try:
        rec = db.query(UploadedMediaDB).filter(UploadedMediaDB.filename == filename).first()
        if not rec:
            rec = UploadedMediaDB(
                filename=filename,
                mime_type=mime_type,
                file_size=len(data),
                data=data,
            )
            db.add(rec)
        else:
            rec.data = data
            rec.file_size = len(data)
            rec.mime_type = mime_type
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save media to database: {e}")
