import os
import logging
from dotenv import load_dotenv
from email_utils import send_contact_form_notification

# Load env variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def verify_email():
    print("--- Starting Email Verification ---")

    # Check Env
    api_key = os.getenv("BREVO_API_KEY")
    contact_email = os.getenv("CONTACT_EMAIL")
    print(f"Contact Email: {contact_email}")
    print(f"API Key Present: {bool(api_key)}")

    if not api_key or not contact_email:
        print("ERROR: Missing configuration.")
        return

    # Test Data
    test_name = "Verification Bot"
    test_email = "test.sender@example.com"
    test_message = "This is a test message to verify the Reply-To fix."

    print(f"Sending test email from {test_name} ({test_email})...")

    success = send_contact_form_notification(test_name, test_email, test_message)

    if success:
        print("\nSUCCESS: Email sent successfully!")
        print(f"Please check the inbox of {contact_email}.")
        print("Note: Check the Spam/Junk folder if not found in Inbox.")
    else:
        print("\nFAILURE: Email could not be sent. Check logs above.")


if __name__ == "__main__":
    verify_email()
