import os
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload

# Add parent directory to path to import models and database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import UserDB, CartItemDB, OrderDB
from email_utils import send_abandoned_cart_email

def check_abandoned_carts():
    db = SessionLocal()
    try:
        # Define threshold: Cart updated > 1 hour ago and < 48 hours ago
        # (In production, you'd usually wait 24h, but for demo we can use 1h)
        threshold_start = datetime.utcnow() - timedelta(hours=1)
        threshold_end = datetime.utcnow() - timedelta(hours=48)
        
        print(f"Checking for carts updated between {threshold_end} and {threshold_start}")
        
        # 1. Find users with items in cart updated within threshold
        abandoned_items = db.query(CartItemDB).options(
            joinedload(CartItemDB.user),
            joinedload(CartItemDB.product)
        ).filter(
            CartItemDB.updated_at <= threshold_start,
            CartItemDB.updated_at >= threshold_end
        ).all()
        
        # Group by user
        user_carts = {}
        for item in abandoned_items:
            if item.user_id not in user_carts:
                user_carts[item.user_id] = []
            user_carts[item.user_id].append(item)
            
        print(f"Found {len(user_carts)} potential abandoned carts.")
        
        emails_sent = 0
        for user_id, items in user_carts.items():
            user = items[0].user
            
            # 2. Check if user has placed an order SINCE the last cart update
            last_update = max(item.updated_at for item in items)
            recent_order = db.query(OrderDB).filter(
                OrderDB.customer_email == user.email,
                OrderDB.created_at >= last_update
            ).first()
            
            if not recent_order:
                print(f"Sending recovery email to {user.email}...")
                success = send_abandoned_cart_email(user, items)
                if success:
                    emails_sent += 1
                    # In a real app, you'd mark the items as "recovery email sent" 
                    # to avoid spamming the user every time the script runs.
                    # For now, we'll just log it.
                    
        print(f"Finished. Total recovery emails sent: {emails_sent}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_abandoned_carts()
