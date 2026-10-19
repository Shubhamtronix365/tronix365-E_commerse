import os
import sys
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, joinedload

# Add parent directory to path to import models and database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import UserDB, CartItemDB, OrderDB, BundleDB
from email_utils import send_abandoned_cart_email


def check_abandoned_carts(force_resend: bool = False, hours_threshold: int = 1):
    """
    Scans for abandoned shopping carts, heals any expired/deleted promotional bundles,
    verifies that the user hasn't placed an order since, and dispatches recovery emails.
    Updates abandoned_email_sent_at to prevent duplicate emails.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        threshold_start = now - timedelta(hours=hours_threshold)
        threshold_end = now - timedelta(hours=48)

        print(f"Checking for carts updated between {threshold_end.isoformat()} and {threshold_start.isoformat()}")

        query = (
            db.query(CartItemDB)
            .options(
                joinedload(CartItemDB.user),
                joinedload(CartItemDB.product),
                joinedload(CartItemDB.bundle),
            )
            .filter(
                CartItemDB.updated_at <= threshold_start,
                CartItemDB.updated_at >= threshold_end,
            )
        )

        if not force_resend:
            query = query.filter(CartItemDB.abandoned_email_sent_at.is_(None))

        abandoned_items = query.all()

        # Step 1: Self-heal any stale or expired bundles in abandoned items
        bundles_healed = 0
        for item in abandoned_items:
            if item.bundle_id:
                bundle = item.bundle
                is_invalid = False
                if not bundle or not getattr(bundle, "is_active", True):
                    is_invalid = True
                elif getattr(bundle, "expiry_date", None):
                    exp = bundle.expiry_date
                    if exp.tzinfo is None:
                        exp = exp.replace(tzinfo=timezone.utc)
                    if now > exp:
                        is_invalid = True
                elif getattr(bundle, "usage_limit", None) and (bundle.used_count or 0) >= bundle.usage_limit:
                    is_invalid = True

                if is_invalid:
                    item.bundle_id = None
                    item.bundle = None
                    bundles_healed += 1

        if bundles_healed > 0:
            db.commit()
            print(f"Self-healed {bundles_healed} abandoned cart item(s) with stale/expired bundles.")

        # Step 2: Group by user and filter out items with deleted products
        user_carts = {}
        for item in abandoned_items:
            if not item.user_id or not item.user:
                continue
            if not item.product:
                continue  # Skip deleted or missing products
            if item.user_id not in user_carts:
                user_carts[item.user_id] = []
            user_carts[item.user_id].append(item)

        print(f"Found {len(user_carts)} potential abandoned carts eligible for reminders.")

        emails_sent = 0
        for user_id, items in user_carts.items():
            if not items:
                continue
            user = items[0].user
            if not user or not user.email:
                continue

            # Check if user has placed an order SINCE the last cart update
            valid_updates = [item.updated_at for item in items if item.updated_at]
            if not valid_updates:
                continue
            last_update = max(valid_updates)

            recent_order = (
                db.query(OrderDB)
                .filter(
                    OrderDB.customer_email == user.email,
                    OrderDB.created_at >= last_update,
                )
                .first()
            )

            if not recent_order:
                print(f"Sending recovery email to {user.email} ({len(items)} items)...")
                try:
                    success = send_abandoned_cart_email(user, items)
                except Exception as mail_err:
                    print(f"Failed sending email to {user.email}: {mail_err}")
                    success = False

                if success:
                    emails_sent += 1
                    # Stamp all items in this cart so user isn't spammed
                    sent_timestamp = datetime.now(timezone.utc)
                    for itm in items:
                        itm.abandoned_email_sent_at = sent_timestamp
                    db.commit()

        print(f"Finished. Total recovery emails sent: {emails_sent}")
        return {
            "eligible_carts": len(user_carts),
            "emails_sent": emails_sent,
            "stale_bundles_healed": bundles_healed,
        }

    finally:
        db.close()


if __name__ == "__main__":
    check_abandoned_carts()
