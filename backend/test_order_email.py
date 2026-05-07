import os
import sys

from dotenv import load_dotenv

load_dotenv()

# Add backend to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import OrderDB
from email_utils import send_order_confirmation_email


def test_email():
    db = SessionLocal()
    try:
        # Get the most recent order from the database to test with
        order = db.query(OrderDB).order_by(OrderDB.created_at.desc()).first()
        if not order:
            print("No orders found in the database to test with.")
            return

        print(f"Testing HTML generation for Order #{order.id}...")

        # Override the email to send it to the contact email for testing
        test_email_address = os.getenv("CONTACT_EMAIL")
        if test_email_address:
            original_email = order.customer_email
            order.customer_email = test_email_address
            print(
                f"Sending test email to: {test_email_address} (Original was {original_email})"
            )

        success = send_order_confirmation_email(order)

        if success:
            print("Success! Check your inbox.")
        else:
            print("Failed to send email.")

    finally:
        db.close()


if __name__ == "__main__":
    test_email()
