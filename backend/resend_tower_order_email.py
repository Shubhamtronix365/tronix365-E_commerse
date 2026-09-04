import os
import sys
from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal
from models import TowerOrderDB
from email_utils import (
    send_tower_order_inquiry_email,
    send_tower_order_quotation_email,
    send_tower_order_payment_verified_email,
    send_tower_order_dispatched_email,
)

def resend_tower_email(order_id: int = None, stage: str = "inquiry"):
    db = SessionLocal()
    try:
        if order_id:
            order = db.query(TowerOrderDB).filter(TowerOrderDB.id == order_id).first()
        else:
            order = db.query(TowerOrderDB).order_by(TowerOrderDB.id.desc()).first()

        if not order:
            print("[ERROR] No Tower Orders found in database!")
            return

        print(f"Loaded Tower Order #{order.order_number} (ID: {order.id})")
        print(f" - Customer: {order.customer_name} <{order.customer_email}>")
        print(f" - Mandatory CC: shubham.tronix365@gmail.com")
        print(f" - Product: {order.product_name}")
        print(f" - Status: {order.status}")
        print(f" - Target Price: Rs. {order.target_price} | Qty: {order.requested_qty}")

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

        print(f"\nDispatching '{stage}' email via Brevo...")
        if stage == "quotation":
            res = send_tower_order_quotation_email(order, frontend_url)
        elif stage == "payment":
            res = send_tower_order_payment_verified_email(order, frontend_url)
        elif stage == "shipment":
            res = send_tower_order_dispatched_email(order, frontend_url)
        else:
            res = send_tower_order_inquiry_email(order, frontend_url)

        if res:
            print("\n[SUCCESS] Email successfully delivered to recipient and CC inbox!")
        else:
            print("\n[FAILED] Email delivery failed at email provider. Check error logs in EmailLogDB table.")

    finally:
        db.close()

if __name__ == "__main__":
    oid = int(sys.argv[1]) if len(sys.argv) > 1 else None
    stg = sys.argv[2] if len(sys.argv) > 2 else "inquiry"
    resend_tower_email(oid, stg)
