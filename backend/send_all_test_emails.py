import os
import sys
import time
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from email_utils import (
    send_email_via_brevo,
    generate_order_status_email_html,
    send_otp_email,
    send_contact_form_notification,
    send_abandoned_cart_email,
)

TARGET_EMAIL = "bhaveshburad729@gmail.com"

LOGO_CDN = "https://cdn.jsdelivr.net/gh/bhaveshburad729/tronix365-E_commerse@main/src/assets/logo.png"

class DummyProduct:
    def __init__(self, id, title, image):
        self.id = id
        self.title = title
        self.image = image

class DummyItem:
    def __init__(self, id, title, price, qty, image):
        self.product = DummyProduct(id, title, image)
        self.price_at_purchase = price
        self.quantity = qty

class DummyOrder:
    def __init__(self):
        self.id = 365
        self.customer_name = "Bhavesh Burad"
        self.customer_email = TARGET_EMAIL
        self.phone = "+91 88301 53805"
        self.address_line = "Sinhgad College Campus, Vadgaon Budruk"
        self.city = "Pune"
        self.state = "Maharashtra"
        self.pincode = "411041"
        self.total_amount = 1499.00
        self.subtotal = 1499.00
        self.shipping_fee = 0.00
        self.payment_method = "Online UPI / Credit Card"
        self.payment_status = "Paid"
        self.status = "confirmed"
        self.courier = "Delhivery Express"
        self.tracking_number = "TRX365998877IN"
        self.txnid = "PAY_TXN_99887766"
        self.created_at = datetime.now()
        self.items = [
            DummyItem(1, "Arduino Uno R3 Microcontroller Board", 499.00, 2, "/uploads/Arduino_Uno R3.jpg"),
            DummyItem(2, "ESP32 Wi-Fi + Bluetooth Dev Board", 501.00, 1, "/uploads/ESP8266 NodeMCU.webp")
        ]

def run_test_email_dispatch():
    print(f"Starting test email dispatch to: {TARGET_EMAIL}")
    results = {}
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173/e-commerse")

    # 1. OTP Email
    print("\n[1/12] Sending OTP Verification Email...")
    res_otp = send_otp_email(TARGET_EMAIL, "849201")
    results["OTP Verification"] = res_otp
    time.sleep(1)

    # 2. Contact Form Notification
    print("\n[2/12] Sending Contact Form Inquiry Notification Email...")
    res_contact = send_contact_form_notification(
        name="Bhavesh Burad",
        email=TARGET_EMAIL,
        message="Hello Tronix365, I am inquiring about bulk orders of ESP32 boards for a robotics workshop."
    )
    results["Contact Form Inquiry"] = res_contact
    time.sleep(1)

    # 3. Abandoned Cart Email
    print("\n[3/12] Sending Abandoned Cart Reminder Email...")
    cart_items = [
        {"id": 1, "title": "Raspberry Pi 4 Model B (4GB)", "price": 4500.0, "quantity": 1, "image": "/uploads/Raspberry Pi 4 Model B (4GB).jpg"},
        {"id": 2, "title": "OLED Display Module 0.96 inch", "price": 250.0, "quantity": 2, "image": "/uploads/OLED-Display.jpg"}
    ]
    res_cart = send_abandoned_cart_email(TARGET_EMAIL, "Bhavesh Burad", cart_items, frontend_url)
    results["Abandoned Cart Reminder"] = res_cart
    time.sleep(1)

    # 4. Order Lifecycle Email Statuses
    order = DummyOrder()
    order_statuses = [
        ("pending", "Order Placed / Pending Confirmation"),
        ("confirmed", "Order Confirmed"),
        ("payment_received", "Payment Confirmed"),
        ("processing", "Order Processing & Assembling"),
        ("packed", "Order Packed & Sealed"),
        ("shipped", "Order Dispatched / Shipped"),
        ("out_for_delivery", "Order Out For Delivery"),
        ("delivered", "Order Delivered Successfully"),
        ("cancelled", "Order Cancelled"),
    ]

    for idx, (st, label) in enumerate(order_statuses, start=4):
        print(f"\n[{idx}/12] Sending Order Status Email ({label})...")
        html_content = generate_order_status_email_html(order, st, frontend_url)
        subject = f"TEST - Order #0365 Update: {label} - Tronix365"
        res_st = send_email_via_brevo(
            to_email=TARGET_EMAIL,
            subject=subject,
            html_content=html_content,
            sender_name="Tronix365 Orders",
            order_id=None,
            status_trigger=f"test_{st}"
        )
        results[f"Order Status: {label}"] = res_st
        time.sleep(1)

    print("\n" + "="*60)
    print("TEST EMAIL DISPATCH SUMMARY RESULTS:")
    print("="*60)
    all_success = True
    for name, success in results.items():
        status_str = "[SUCCESS]" if success else "[FAILED]"
        print(f" - {name}: {status_str}")
        if not success:
            all_success = False

    if all_success:
        print("\nALL TEST EMAILS SENT SUCCESSFULLY TO " + TARGET_EMAIL)
    else:
        print("\nSOME EMAILS FAILED TO DISPATCH. CHECK LOGS ABOVE.")

if __name__ == "__main__":
    run_test_email_dispatch()
