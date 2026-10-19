import os
import hmac
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from models import CartItemDB, BundleDB
from scripts.abandoned_cart_check import check_abandoned_carts

router = APIRouter(prefix="/cron", tags=["Cron Jobs & Automation"])

DEFAULT_CRON_SECRET = "tronix365_cron_secret"


def verify_cron_secret(
    key: Optional[str] = Query(None, description="Cron secret key query parameter"),
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret", description="Cron secret header"),
):
    """
    Validates that the incoming request contains the correct cron secret.
    Allows automated services like Cron-Job.org or GitHub Actions to run tasks safely.
    """
    configured_secret = os.getenv("CRON_SECRET", DEFAULT_CRON_SECRET).strip()
    provided_secret = (key or x_cron_secret or "").strip()

    if not provided_secret or not hmac.compare_digest(provided_secret, configured_secret):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing cron secret key. Pass ?key=your_secret or header X-Cron-Secret.",
        )
    return True


@router.api_route("/keep-alive", methods=["GET", "HEAD"])
async def cron_keep_alive(db: Session = Depends(get_db)):
    """
    Lightweight keep-alive ping for uptime monitors (Cron-Job.org, UptimeRobot, Better Stack).
    Pings both the FastAPI application and the Neon PostgreSQL database (via SELECT 1)
    to prevent Render free tier service and Neon serverless compute from sleeping.
    Supports both GET and HEAD requests.
    """
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"degraded: {str(exc)}"

    return {
        "status": "ok",
        "service": "tronix365-backend",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "instruction": "Ping this URL every 10 minutes to prevent cold starts.",
    }


@router.api_route("/abandoned-carts", methods=["GET", "POST"])
async def cron_abandoned_carts(
    hours_threshold: int = Query(1, ge=1, le=168, description="Hours of inactivity before cart is considered abandoned"),
    force_resend: bool = Query(False, description="Resend reminders even if already sent once"),
    authorized: bool = Depends(verify_cron_secret),
):
    """
    Automated cron job endpoint for abandoned cart recovery.
    Scans for inactive carts, self-heals any expired/deleted promotional bundles,
    verifies user has not completed an order, and dispatches recovery emails via Brevo.
    Can be scheduled via Cron-Job.org or Render Cron every 1–2 hours.
    """
    result = check_abandoned_carts(force_resend=force_resend, hours_threshold=hours_threshold)
    return {
        "success": True,
        "message": f"Abandoned cart check executed. Sent {result['emails_sent']} recovery emails.",
        "details": result,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.api_route("/cleanup-stale-bundles", methods=["GET", "POST"])
async def cron_cleanup_stale_bundles(
    db: Session = Depends(get_db),
    authorized: bool = Depends(verify_cron_secret),
):
    """
    Proactively checks all cart items in the database and unlinks any bundles
    that have been deleted by the admin or reached their expiration date / usage limit.
    Ensures abandoned carts and active carts are always synchronized.
    """
    now = datetime.now(timezone.utc)
    cart_items_with_bundles = (
        db.query(CartItemDB)
        .filter(CartItemDB.bundle_id.isnot(None))
        .all()
    )

    unlinked_count = 0
    for item in cart_items_with_bundles:
        bundle = db.query(BundleDB).filter(BundleDB.id == item.bundle_id).first()
        is_invalid = False

        if not bundle or not bundle.is_active:
            is_invalid = True
        elif bundle.expiry_date:
            exp = bundle.expiry_date
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if now > exp:
                is_invalid = True
        elif bundle.usage_limit and (bundle.used_count or 0) >= bundle.usage_limit:
            is_invalid = True

        if is_invalid:
            item.bundle_id = None
            unlinked_count += 1

    if unlinked_count > 0:
        db.commit()

    return {
        "success": True,
        "message": f"Stale bundle sweep completed. Unlinked {unlinked_count} invalid bundle item(s).",
        "unlinked_count": unlinked_count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
