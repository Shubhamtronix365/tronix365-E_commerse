import os
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload

# Add parent directory to path to import models and database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import UserDB, CartItemDB, OrderDB
from email_utils import send_abandoned_cart_email


def check_abandoned_carts(force_resend: bool = False, hours_threshold: int = 1):
    """
    Scans for abandoned shopping carts, verifies that the user hasn't placed an order since,
    and dispatches recovery emails. Updates abandoned_email_sent_at to prevent duplicate emails.
    """
    db = SessionLocal()
    try:
        # Define threshold: Cart updated >= hours_threshold ago and < 48 hours ago
        threshold_start = datetime.utcnow() - timedelta(hours=hours_threshold)
        threshold_end = datetime.utcnow() - timedelta(hours=48)

        print(f"Checking for carts updated between {threshold_end} and {threshold_start}")

        query = (
            db.query(CartItemDB)
            .options(joinedload(CartItemDB.user), joinedload(CartItemDB.product))
            .filter(
                CartItemDB.updated_at <= threshold_start,
                CartItemDB.updated_at >= threshold_end,
            )
        )

        if not force_resend:
            query = query.filter(CartItemDB.abandoned_email_sent_at.is_(None))

        abandoned_items = query.all()

        # Group by user
        user_carts = {}
        for item in abandoned_items:
            if not item.user_id or not item.user:
                continue
            if item.user_id not in user_carts:
                user_carts[item.user_id] = []
            user_carts[item.user_id].append(item)

        print(f"Found {len(user_carts)} potential abandoned carts eligible for reminders.")

        emails_sent = 0
        for user_id, items in user_carts.items():
            user = items[0].user
            if not user or not user.email:
                continue

            # Check if user has placed an order SINCE the last cart update
            last_update = max(item.updated_at for item in items if item.updated_at)
            recent_order = (
                db.query(OrderDB)
                .filter(
                    OrderDB.customer_email == user.email,
                    OrderDB.created_at >= last_update,
                )
                .first()
            )

            if not recent_order:
                print(f"Sending recovery email to {user.email}...")
                success = send_abandoned_cart_email(user, items, coupon_code="RECOVER5")
                if success:
                    emails_sent += 1
                    # Stamp all items in this cart so user isn't spammed
                    sent_timestamp = datetime.utcnow()
                    for itm in items:
                        itm.abandoned_email_sent_at = sent_timestamp
                    db.commit()

        print(f"Finished. Total recovery emails sent: {emails_sent}")
        return {"eligible_carts": len(user_carts), "emails_sent": emails_sent}

    finally:
        db.close()


if __name__ == "__main__":
    check_abandoned_carts()
