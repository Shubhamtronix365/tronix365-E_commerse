import os
import requests
import logging
import base64
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
SENDER_EMAIL = os.getenv("CONTACT_EMAIL", "support@tronix365.com")
MANDATORY_CC_EMAIL = "shubham.tronix365@gmail.com"


def get_logo_base64():
    """Reads the logo.png file and returns a base64 Data URI string."""
    try:
        logo_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "src", "assets", "logo.png")
        )
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
                return f"data:image/png;base64,{encoded}"
    except Exception as e:
        logger.error(f"Error encoding logo: {e}")
    return ""


def log_email_to_db(
    order_id: int,
    recipients_str: str,
    subject: str,
    status_trigger: str,
    delivery_status: str,
    error_message: str = None,
):
    """Logs an email event into the database email_logs table."""
    try:
        from database import SessionLocal
        from models import EmailLogDB

        db = SessionLocal()
        try:
            log_entry = EmailLogDB(
                order_id=order_id,
                recipient=recipients_str,
                subject=subject,
                status_trigger=status_trigger or "general",
                delivery_status=delivery_status,
                error_message=error_message,
            )
            db.add(log_entry)
            db.commit()
        finally:
            db.close()
    except Exception as err:
        logger.error(f"Failed to write email log to database: {err}")


def send_email_via_brevo(
    to_email: str,
    subject: str,
    html_content: str,
    sender_name: str = "Tronix365",
    sender_email: str = None,
    reply_to: dict = None,
    order_id: int = None,
    status_trigger: str = "general",
):
    """
    Sends an email using the Brevo API.
    MANDATORY REQUIREMENT: Always sends to both the customer and shubham.tronix365@gmail.com.
    """
    if not sender_email:
        sender_email = SENDER_EMAIL

    # Construct recipient list ensuring mandatory co-recipient shubham.tronix365@gmail.com
    to_list = []
    if isinstance(to_email, list):
        for e in to_email:
            if e and e.strip():
                to_list.append({"email": e.strip()})
    elif to_email and to_email.strip():
        to_list.append({"email": to_email.strip()})

    # Check if mandatory recipient is present, if not add it
    has_mandatory = any(
        recipient.get("email", "").lower() == MANDATORY_CC_EMAIL.lower()
        for recipient in to_list
    )
    if not has_mandatory:
        to_list.append({"email": MANDATORY_CC_EMAIL})

    recipients_str = ", ".join([r["email"] for r in to_list])

    if not BREVO_API_KEY:
        msg = "BREVO_API_KEY not set. Skipping email dispatch."
        logger.warning(msg)
        log_email_to_db(order_id, recipients_str, subject, status_trigger, "failed", msg)
        return False

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": to_list,
        "subject": subject,
        "htmlContent": html_content,
    }

    if reply_to:
        payload["replyTo"] = reply_to

    try:
        response = requests.post(
            BREVO_API_URL, json=payload, headers=headers, timeout=10
        )
        response.raise_for_status()
        msg_id = response.json().get("messageId", "OK")
        logger.info(
            f"Email sent successfully to [{recipients_str}]. Status: {status_trigger}, Message ID: {msg_id}"
        )
        log_email_to_db(order_id, recipients_str, subject, status_trigger, "sent")
        return True
    except requests.exceptions.RequestException as e:
        err_msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            err_msg += f" | Brevo: {e.response.text}"
        logger.error(f"Failed to send email via Brevo: {err_msg}")
        log_email_to_db(order_id, recipients_str, subject, status_trigger, "failed", err_msg)
        return False


def send_contact_form_notification(name: str, email: str, message: str):
    """
    Sends a notification to the admin/support email when a contact form is submitted.
    """
    to_email = os.getenv("CONTACT_EMAIL", MANDATORY_CC_EMAIL)
    subject = f"New Contact Message from {name}"

    html_body = f"""
    <html>
    <body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; padding: 20px;">
            <h2 style="color: #6d28d9; border-bottom: 2px solid #6d28d9; padding-bottom: 10px;">New Contact Message</h2>
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Email:</strong> {email}</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap;">{message}</p>
            </div>
            <p style="font-size: 12px; color: #888;">This email was sent from the Tronix365 Contact Form.</p>
        </div>
    </body>
    </html>
    """

    return send_email_via_brevo(
        to_email,
        subject,
        html_body,
        sender_name="Tronix365 Contact Form",
        reply_to={"name": name, "email": email},
        status_trigger="contact_form",
    )


def generate_order_status_email_html(order, status: str, frontend_url: str):
    """
    Generates dynamic, highly responsive HTML email templates customized for EVERY order status.
    Covers Order Placed, Confirmed, Payment Received, Processing, Packed, Shipped, Out for Delivery,
    Delivered, Cancelled, Refunds, Returns, Exchanges, and future statuses.
    """
    status_lower = (status or "pending").lower().strip()
    formatted_status = status_lower.replace("_", " ").title()

    # Formatted Created Date
    date_str = (
        order.created_at.strftime("%B %d, %Y %I:%M %p")
        if hasattr(order, "created_at") and hasattr(order.created_at, "strftime")
        else str(getattr(order, "created_at", "N/A")).split(".")[0].replace("T", " ")
    )

    customer_name = order.full_name or (
        order.customer_email.split("@")[0] if order.customer_email else "Valued Customer"
    )

    address_parts = [
        order.address_line,
        order.city,
        order.state,
        f"PIN: {order.pincode}" if order.pincode else None,
    ]
    address_formatted = (
        ", ".join([p for p in address_parts if p]) if any(address_parts) else "N/A"
    )

    # Clean, lightweight email brand badge (prevents Gmail clipping & empty white boxes)
    logo_img = f'''<span style="background-color: #6d28d9; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: 900; padding: 6px 12px; border-radius: 8px; display: inline-block; vertical-align: middle; letter-spacing: 0.5px;">⚡ TRONIX</span>'''

    items_subtotal = sum(
        (item.price_at_purchase or 0.0) * item.quantity for item in order.items
    )
    discount_amount = getattr(order, "discount_amount", 0.0) or 0.0
    coupon_code = getattr(order, "coupon_code", None)

    discount_row = ""
    if discount_amount > 0:
        coupon_label = f"Discount ({coupon_code})" if coupon_code else "Discount"
        discount_row = f"""
        <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #16a34a; font-weight: 500;">{coupon_label}</td>
            <td style="padding: 6px 0; font-size: 14px; color: #16a34a; text-align: right; font-weight: 700;">- ₹{discount_amount:,.2f}</td>
        </tr>
        """

    subtotal = max(order.total_amount, 0.0)
    gst = subtotal - (subtotal / 1.18) if subtotal > 0 else 0.0

    # Build Item Rows
    item_rows = ""
    for item in order.items:
        img_url = (
            item.product.image
            if getattr(item, "product", None) and getattr(item.product, "image", None)
            else "https://placehold.co/80?text=TRONIX365"
        )
        if img_url.startswith("/"):
            img_url = f"{frontend_url}{img_url}"

        title = item.product.title if getattr(item, "product", None) else "Electronics Item"
        unit_price = item.price_at_purchase or 0.0
        line_total = unit_price * item.quantity

        item_rows += f"""
        <tr>
            <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; width: 64px; vertical-align: middle;">
                <img src="{img_url}" alt="{title}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; display: block;" />
            </td>
            <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; text-align: left; vertical-align: middle;">
                <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px; line-height: 1.4;">{title}</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Qty: <strong style="color: #6d28d9;">{item.quantity}</strong> &nbsp;|&nbsp; Price: ₹{unit_price:,.2f}</p>
            </td>
            <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: middle; width: 110px;">
                <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 15px;">₹{line_total:,.2f}</p>
            </td>
        </tr>
        """

    order_url = f"{frontend_url}/order/{order.id}"
    user_dashboard_url = f"{frontend_url}/dashboard"

    # Define status specific metadata (theme color, badge text, header title, body message, banner color)
    status_config = {
        "pending": {
            "color": "#d97706",
            "bg": "#fef3c7",
            "border": "#fde68a",
            "badge_text": "⏳ Order Received",
            "title": "Order Received & Pending Processing",
            "message": f"Hi <strong>{customer_name}</strong>, thank you for your order! Your purchase <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> has been received and is pending verification.",
            "cta_text": "View Order Status",
            "cta_url": order_url,
        },
        "confirmed": {
            "color": "#16a34a",
            "bg": "#dcfce7",
            "border": "#bbf7d0",
            "badge_text": "✔ Order Confirmed",
            "title": "Order Confirmed!",
            "message": f"Hi <strong>{customer_name}</strong>, your purchase <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> has been approved and is being prepared for packing.",
            "cta_text": "Track Order & Invoice",
            "cta_url": order_url,
        },
        "payment_received": {
            "color": "#0284c7",
            "bg": "#e0f2fe",
            "border": "#bae6fd",
            "badge_text": "💳 Payment Received",
            "title": "Payment Confirmed",
            "message": f"Hi <strong>{customer_name}</strong>, we have received your payment for order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong>. Transaction ID: <strong>{getattr(order, 'txnid', 'Verified')}</strong>.",
            "cta_text": "View Receipt & Order Details",
            "cta_url": order_url,
        },
        "processing": {
            "color": "#6d28d9",
            "bg": "#f3e8ff",
            "border": "#e9d5ff",
            "badge_text": "⚙ Processing Order",
            "title": "Order is Being Processed",
            "message": f"Hi <strong>{customer_name}</strong>, your order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> is currently being assembled and quality checked by our technical team.",
            "cta_text": "Check Live Progress",
            "cta_url": order_url,
        },
        "packed": {
            "color": "#0891b2",
            "bg": "#cff4fc",
            "border": "#99e9f2",
            "badge_text": "📦 Order Packed",
            "title": "Your Order is Packed & Sealed!",
            "message": f"Hi <strong>{customer_name}</strong>, your items for order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> are safely packed and ready for dispatch.",
            "cta_text": "Track Order Details",
            "cta_url": order_url,
        },
        "shipped": {
            "color": "#2563eb",
            "bg": "#dbeafe",
            "border": "#bfdbfe",
            "badge_text": "🚚 Order Shipped",
            "title": "Your Package is On Its Way!",
            "message": f"Hi <strong>{customer_name}</strong>, your order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> has been handed over to our courier partner for delivery.",
            "cta_text": "Track Delivery & Details",
            "cta_url": order_url,
        },
        "out_for_delivery": {
            "color": "#9333ea",
            "bg": "#f3e8ff",
            "border": "#e9d5ff",
            "badge_text": "🛵 Out For Delivery",
            "title": "Out For Delivery Today!",
            "message": f"Hi <strong>{customer_name}</strong>, get ready! Your order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> is out for delivery today.",
            "cta_text": "Track Live Courier Status",
            "cta_url": order_url,
        },
        "delivered": {
            "color": "#16a34a",
            "bg": "#dcfce7",
            "border": "#bbf7d0",
            "badge_text": "🎉 Order Delivered",
            "title": "Delivered Successfully!",
            "message": f"Hi <strong>{customer_name}</strong>, your order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> has been delivered. Thank you for shopping with Tronix365!",
            "cta_text": "Review Product & Invoice",
            "cta_url": order_url,
        },
        "cancelled": {
            "color": "#dc2626",
            "bg": "#fee2e2",
            "border": "#fca5a5",
            "badge_text": "✖ Order Cancelled",
            "title": "Order Cancellation Notice",
            "message": f"Hi <strong>{customer_name}</strong>, your order <strong style='color: #dc2626;'>#order_tronix_{order.id:04d}</strong> has been cancelled.",
            "cta_text": "Contact Support",
            "cta_url": f"{frontend_url}/info/contact",
        },
        "deleted": {
            "color": "#dc2626",
            "bg": "#fee2e2",
            "border": "#fca5a5",
            "badge_text": "✖ Order Cancelled",
            "title": "Order Cancellation Notice",
            "message": f"Hi <strong>{customer_name}</strong>, your order <strong style='color: #dc2626;'>#order_tronix_{order.id:04d}</strong> has been cancelled.",
            "cta_text": "Contact Support",
            "cta_url": f"{frontend_url}/info/contact",
        },
        "refund_initiated": {
            "color": "#0284c7",
            "bg": "#e0f2fe",
            "border": "#bae6fd",
            "badge_text": "💸 Refund Initiated",
            "title": "Refund Process Initiated",
            "message": f"Hi <strong>{customer_name}</strong>, a refund for your order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> has been initiated.",
            "cta_text": "View Refund Details",
            "cta_url": order_url,
        },
        "refund_completed": {
            "color": "#16a34a",
            "bg": "#dcfce7",
            "border": "#bbf7d0",
            "badge_text": "✅ Refund Completed",
            "title": "Refund Transferred Successfully",
            "message": f"Hi <strong>{customer_name}</strong>, your refund for order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> has been processed successfully to your original payment method.",
            "cta_text": "View Account Dashboard",
            "cta_url": user_dashboard_url,
        },
        "failed_payment": {
            "color": "#dc2626",
            "bg": "#fee2e2",
            "border": "#fca5a5",
            "badge_text": "⚠️ Payment Failed",
            "title": "Payment Transaction Failed",
            "message": f"Hi <strong>{customer_name}</strong>, payment for your order <strong style='color: #dc2626;'>#order_tronix_{order.id:04d}</strong> could not be processed.",
            "cta_text": "Retry Payment",
            "cta_url": order_url,
        },
        "return_requested": {
            "color": "#d97706",
            "bg": "#fef3c7",
            "border": "#fde68a",
            "badge_text": "↩ Return Requested",
            "title": "Return Request Received",
            "message": f"Hi <strong>{customer_name}</strong>, we received your return request for order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> and are currently reviewing it.",
            "cta_text": "View Return Status",
            "cta_url": order_url,
        },
        "return_approved": {
            "color": "#16a34a",
            "bg": "#dcfce7",
            "border": "#bbf7d0",
            "badge_text": "✔ Return Approved",
            "title": "Return Request Approved",
            "message": f"Hi <strong>{customer_name}</strong>, your return request for order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> has been approved. Pickup will be scheduled shortly.",
            "cta_text": "View Return Instructions",
            "cta_url": order_url,
        },
        "return_rejected": {
            "color": "#dc2626",
            "bg": "#fee2e2",
            "border": "#fca5a5",
            "badge_text": "✖ Return Declined",
            "title": "Return Request Update",
            "message": f"Hi <strong>{customer_name}</strong>, your return request for order <strong style='color: #dc2626;'>#order_tronix_{order.id:04d}</strong> was reviewed and could not be approved.",
            "cta_text": "Contact Support Team",
            "cta_url": f"{frontend_url}/info/contact",
        },
        "exchange_approved": {
            "color": "#16a34a",
            "bg": "#dcfce7",
            "border": "#bbf7d0",
            "badge_text": "🔄 Exchange Approved",
            "title": "Exchange Request Approved",
            "message": f"Hi <strong>{customer_name}</strong>, your exchange request for order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> has been approved.",
            "cta_text": "Track Exchange Shipment",
            "cta_url": order_url,
        },
        "exchange_rejected": {
            "color": "#dc2626",
            "bg": "#fee2e2",
            "border": "#fca5a5",
            "badge_text": "✖ Exchange Declined",
            "title": "Exchange Request Update",
            "message": f"Hi <strong>{customer_name}</strong>, your exchange request for order <strong style='color: #dc2626;'>#order_tronix_{order.id:04d}</strong> was reviewed and could not be approved.",
            "cta_text": "Contact Customer Support",
            "cta_url": f"{frontend_url}/info/contact",
        },
    }

    # Default fallback for any unlisted or custom future status
    cfg = status_config.get(
        status_lower,
        {
            "color": "#6d28d9",
            "bg": "#faf5ff",
            "border": "#f3e8ff",
            "badge_text": f"📌 Status: {formatted_status}",
            "title": f"Order Status Update: {formatted_status}",
            "message": f"Hi <strong>{customer_name}</strong>, your order <strong style='color: #6d28d9;'>#order_tronix_{order.id:04d}</strong> status has been updated to <strong>{formatted_status}</strong>.",
            "cta_text": "View Order Details",
            "cta_url": order_url,
        },
    )

    # Build Shipping Info Card if courier/tracking available
    courier_name = getattr(order, "courier", None)
    tracking_num = getattr(order, "tracking_number", None)
    est_date = getattr(order, "estimated_delivery_date", None)
    est_time = getattr(order, "estimated_arrival_time", None)

    shipping_card_html = ""
    if courier_name or tracking_num or est_date or est_time or status_lower in ["shipped", "out_for_delivery"]:
        shipping_card_html = f"""
        <tr>
            <td style="padding: 0 28px 20px;">
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px;">
                    <h4 style="margin: 0 0 10px; font-size: 13px; color: #1e40af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        🚚 Shipping & Tracking Information
                    </h4>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #1e3a8a;">
                        <tr>
                            <td style="padding: 3px 0; width: 40%;"><strong>Shipping Method / Courier:</strong></td>
                            <td style="padding: 3px 0; font-weight: 700;">{courier_name or 'Standard Courier Delivery'}</td>
                        </tr>
                        {'<tr><td style="padding: 3px 0;"><strong>Tracking Number:</strong></td><td style="padding: 3px 0; font-weight: 700; color: #2563eb;">' + tracking_num + '</td></tr>' if tracking_num else ''}
                        {'<tr><td style="padding: 3px 0;"><strong>Estimated Delivery Date:</strong></td><td style="padding: 3px 0; font-weight: 700;">' + est_date + '</td></tr>' if est_date else ''}
                        {'<tr><td style="padding: 3px 0;"><strong>Estimated Arrival Time:</strong></td><td style="padding: 3px 0; font-weight: 700;">' + est_time + '</td></tr>' if est_time else ''}
                    </table>
                </div>
            </td>
        </tr>
        """

    # Build Cancellation Card if cancelled
    cancellation_reason = getattr(order, "cancellation_reason", None)
    refund_status = getattr(order, "refund_status", None)
    canc_date_str = (
        order.cancellation_date.strftime("%B %d, %Y %I:%M %p")
        if hasattr(order, "cancellation_date") and getattr(order, "cancellation_date", None) and hasattr(order.cancellation_date, "strftime")
        else date_str
    )

    cancellation_card_html = ""
    if status_lower in ["cancelled", "deleted"] or cancellation_reason or refund_status:
        refund_info_text = (
            refund_status
            if refund_status
            else "Payment will be refunded to original payment method within 3-7 working days."
        )
        cancellation_card_html = f"""
        <tr>
            <td style="padding: 0 28px 20px;">
                <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 16px;">
                    <h4 style="margin: 0 0 10px; font-size: 13px; color: #991b1b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        ⚠️ Cancellation & Refund Details
                    </h4>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #7f1d1d;">
                        <tr>
                            <td style="padding: 3px 0; width: 35%;"><strong>Cancellation Date:</strong></td>
                            <td style="padding: 3px 0;">{canc_date_str}</td>
                        </tr>
                        {'<tr><td style="padding: 3px 0;"><strong>Reason:</strong></td><td style="padding: 3px 0; font-weight: 700;">' + cancellation_reason + '</td></tr>' if cancellation_reason else ''}
                        <tr>
                            <td style="padding: 3px 0;"><strong>Refund Status:</strong></td>
                            <td style="padding: 3px 0; font-weight: 700; color: #16a34a;">{refund_info_text}</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
        """

    # Build Return/Exchange Rejection Reason Card if applicable
    rejection_reason = getattr(order, "rejection_reason", None)
    return_reason = getattr(order, "return_reason", None)
    reason_card_html = ""
    if rejection_reason or return_reason:
        reason_card_html = f"""
        <tr>
            <td style="padding: 0 28px 20px;">
                <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 16px;">
                    <h4 style="margin: 0 0 10px; font-size: 13px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        📋 Request Details & Notes
                    </h4>
                    {'<p style="margin: 0 0 4px; font-size: 13px; color: #78350f;"><strong>Return/Exchange Reason:</strong> ' + return_reason + '</p>' if return_reason else ''}
                    {'<p style="margin: 0; font-size: 13px; color: #78350f;"><strong>Reviewer Feedback / Note:</strong> ' + rejection_reason + '</p>' if rejection_reason else ''}
                </div>
            </td>
        </tr>
        """
    # Build B2B GST Information Card if GSTIN or B2B Billing requested
    is_gst_invoice = getattr(order, "is_gst_invoice", False)
    gstin_num = getattr(order, "gstin", None)
    comp_name = getattr(order, "company_name", None)
    comp_addr = getattr(order, "company_address", None)

    gst_card_html = ""
    if is_gst_invoice or gstin_num or comp_name:
        gst_card_html = f"""
        <tr>
            <td style="padding: 0 28px 20px;">
                <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 10px; padding: 16px;">
                    <h4 style="margin: 0 0 10px; font-size: 13px; color: #5b21b6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        🏢 Registered B2B GST Billing Information
                    </h4>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #4c1d95;">
                        {'<tr><td style="padding: 3px 0; width: 35%;"><strong>Company Name:</strong></td><td style="padding: 3px 0; font-weight: 700;">' + comp_name + '</td></tr>' if comp_name else ''}
                        {'<tr><td style="padding: 3px 0;"><strong>Customer GSTIN:</strong></td><td style="padding: 3px 0; font-weight: 700; color: #6d28d9; letter-spacing: 1px;">' + gstin_num + '</td></tr>' if gstin_num else ''}
                        {'<tr><td style="padding: 3px 0;"><strong>Registered Address:</strong></td><td style="padding: 3px 0;">' + comp_addr + '</td></tr>' if comp_addr else ''}
                    </table>
                </div>
            </td>
        </tr>
        """

    # Compute GST breakdown
    explicit_subtotal = getattr(order, "subtotal_before_gst", 0.0) or (subtotal / 1.18)
    explicit_gst = getattr(order, "gst_amount", 0.0) or (subtotal - explicit_subtotal)
    cgst = explicit_gst / 2.0
    sgst = explicit_gst / 2.0

    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{cfg['title']} - #order_tronix_{order.id:04d}</title>
    </head>
    <body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 30px 12px; color: #1f2937;">
        
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
            
            <!-- Top Header with Brand Logo -->
            <tr>
                <td style="padding: 24px 28px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="vertical-align: middle;">
                                <div style="display: inline-block; vertical-align: middle;">
                                    {logo_img}
                                </div>
                                <span style="font-size: 22px; font-weight: 900; color: #6d28d9; letter-spacing: -0.5px; vertical-align: middle; margin-left: 8px;">TRONIX365</span>
                            </td>
                            <td style="text-align: right; vertical-align: middle;">
                                <span style="background-color: {cfg['bg']}; color: {cfg['color']}; border: 1px solid {cfg['border']}; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-block;">
                                    {cfg['badge_text']}
                                </span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Hero Banner Greeting -->
            <tr>
                <td style="background-color: {cfg['bg']}; padding: 24px 28px; border-bottom: 1px solid {cfg['border']};">
                    <h1 style="margin: 0 0 8px; font-size: 20px; color: {cfg['color']}; font-weight: 800;">{cfg['title']}</h1>
                    <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">
                        {cfg['message']}
                    </p>
                </td>
            </tr>

            <!-- Shipping Info Card (if present) -->
            {shipping_card_html}

            <!-- Cancellation Card (if present) -->
            {cancellation_card_html}

            <!-- Reason & Notes Card (if present) -->
            {reason_card_html}

            <!-- B2B GST Card (if present) -->
            {gst_card_html}

            <!-- Delivery & Order Info Grid -->
            <tr>
                <td style="padding: 20px 28px 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0;">
                        <tr>
                            <td style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; width: 48%; vertical-align: top;">
                                <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Delivery Address</p>
                                <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #111827;">{customer_name}</p>
                                <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.4;">
                                    {address_formatted}<br>
                                    Phone: {getattr(order, 'phone', 'N/A') or 'N/A'}
                                </p>
                            </td>
                            <td style="width: 4%;"></td>
                            <td style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; width: 48%; vertical-align: top;">
                                <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Order Summary</p>
                                <p style="margin: 0 0 2px; font-size: 13px; color: #374151;"><strong>Order ID:</strong> #order_tronix_{order.id:04d}</p>
                                <p style="margin: 0 0 2px; font-size: 13px; color: #374151;"><strong>Date:</strong> {date_str}</p>
                                <p style="margin: 0 0 2px; font-size: 13px; color: #374151;"><strong>Payment:</strong> {getattr(order, 'txnid', None) or 'Paid / Online'}</p>
                                <p style="margin: 0; font-size: 13px; color: #374151;"><strong>Status:</strong> <span style="color: {cfg['color']}; font-weight: 700;">{formatted_status}</span></p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Items Table Section -->
            <tr>
                <td style="padding: 12px 28px 0;">
                    <h3 style="margin: 0 0 12px; font-size: 14px; color: #111827; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">
                        Items Ordered ({len(order.items)})
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        {item_rows}
                    </table>
                </td>
            </tr>

            <!-- Payment Calculation Box with GST Breakdown -->
            <tr>
                <td style="padding: 20px 28px 24px;">
                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">Subtotal (Excl. GST)</td>
                                <td style="padding: 4px 0; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">₹{explicit_subtotal:,.2f}</td>
                            </tr>
                            {discount_row}
                            <tr>
                                <td style="padding: 4px 0; font-size: 13px; color: #64748b;">CGST (9%)</td>
                                <td style="padding: 4px 0; font-size: 13px; color: #475569; text-align: right; font-weight: 600;">₹{cgst:,.2f}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0; font-size: 13px; color: #64748b;">SGST (9%)</td>
                                <td style="padding: 4px 0; font-size: 13px; color: #475569; text-align: right; font-weight: 600;">₹{sgst:,.2f}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0; font-size: 14px; color: #d97706; font-weight: 600;">Total GST Collected (18%)</td>
                                <td style="padding: 4px 0; font-size: 14px; color: #d97706; text-align: right; font-weight: 700;">₹{explicit_gst:,.2f}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">Shipping Fee</td>
                                <td style="padding: 4px 0; font-size: 14px; color: #16a34a; text-align: right; font-weight: 700;">FREE</td>
                            </tr>
                            <tr>
                                <td style="padding-top: 10px; border-top: 2px solid #e5e7eb; font-size: 16px; color: #111827; font-weight: 800;">Total Amount (Incl. GST)</td>
                                <td style="padding-top: 10px; border-top: 2px solid #e5e7eb; font-size: 18px; color: #6d28d9; text-align: right; font-weight: 900;">₹{order.total_amount:,.2f}</td>
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>

            <!-- Authenticity & Policy Notice Card -->
            <tr>
                <td style="padding: 0 28px 24px;">
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px;">
                        <p style="margin: 0 0 4px; font-size: 13px; color: #15803d; font-weight: 700;">
                            🛡️ 100% Verified Authentic Hardware
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #166534; line-height: 1.4;">
                            All electronic products sold by Tronix365 are original and checked for quality assurance. Need assistance? Contact our 24/7 customer support.
                        </p>
                    </div>
                </td>
            </tr>

            <!-- Call to Action Button -->
            <tr>
                <td style="padding: 0 28px 32px; text-align: center;">
                    <a href="{cfg['cta_url']}" target="_blank" style="display: inline-block; background-color: #6d28d9; color: #ffffff; text-decoration: none; padding: 14px 36px; font-size: 15px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(109, 40, 217, 0.25);">
                        {cfg['cta_text']}
                    </a>
                </td>
            </tr>

            <!-- Footer Section -->
            <tr>
                <td style="background-color: #f9fafb; padding: 20px 28px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 6px; font-size: 13px; color: #6b7280;">
                        Questions? We're here to help! Email us at <a href="mailto:support@tronix365.com" style="color: #6d28d9; text-decoration: none; font-weight: 600;">support@tronix365.com</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                        &copy; 2026 Tronix365 Technologies. All rights reserved.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html_template


def send_order_status_email(order_or_id, status: str):
    """
    Orchestrates order lifecycle email notifications.
    Features:
    1. Automatic deduplication check against recent email logs (60 seconds window).
    2. Dedicated HTML template generation per status.
    3. Mandatory delivery to both customer and shubham.tronix365@gmail.com.
    """
    from database import SessionLocal
    from models import OrderDB, OrderItemDB, EmailLogDB
    from sqlalchemy.orm import joinedload

    order_id = order_or_id if isinstance(order_or_id, int) else order_or_id.id
    status_lower = (status or "pending").lower().strip()

    db = SessionLocal()
    try:
        # Check deduplication: avoid sending duplicate emails for the exact same status within 60 seconds
        recent_log = (
            db.query(EmailLogDB)
            .filter(
                EmailLogDB.order_id == order_id,
                EmailLogDB.status_trigger == status_lower,
                EmailLogDB.delivery_status == "sent",
            )
            .order_by(EmailLogDB.id.desc())
            .first()
        )
        if recent_log and recent_log.created_at:
            time_diff = (
                datetime.utcnow() - recent_log.created_at.replace(tzinfo=None)
            ).total_seconds()
            if time_diff < 60:
                logger.info(
                    f"Duplicate email suppression: Email for order #{order_id} status '{status_lower}' sent {int(time_diff)}s ago. Skipping."
                )
                return True

        # Fetch full order details with product relationships
        order_loaded = (
            db.query(OrderDB)
            .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
            .filter(OrderDB.id == order_id)
            .first()
        )
        if not order_loaded:
            logger.error(
                f"Order ID {order_id} not found in database. Cannot send notification email."
            )
            return False

        to_email = order_loaded.customer_email
        if not to_email:
            logger.error(
                f"Order #{order_loaded.id} has no customer_email. Cannot send notification."
            )
            return False

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        if (
            "tronix365.in" in frontend_url or "tronix.in" in frontend_url
        ) and "/e-commerse" not in frontend_url:
            frontend_url = f"{frontend_url}/e-commerse"

        formatted_status = status_lower.replace("_", " ").title()
        subject = f"Order #{order_loaded.id:04d} Update: {formatted_status} - Tronix365"

        # Generate dedicated status HTML payload
        html_content = generate_order_status_email_html(
            order_loaded, status_lower, frontend_url
        )

        return send_email_via_brevo(
            to_email,
            subject,
            html_content,
            sender_name="Tronix365 Orders",
            order_id=order_loaded.id,
            status_trigger=status_lower,
        )
    except Exception as e:
        logger.error(
            f"Failed to dispatch order status email for order #{order_id}: {e}"
        )
        import traceback
        logger.error(traceback.format_exc())
        return False
    finally:
        db.close()


def send_order_confirmation_email(order):
    """Backwards compatibility alias targeting order status email dispatch."""
    return send_order_status_email(order, "confirmed")


def generate_abandoned_cart_html(user_name, cart_items, frontend_url):
    """Generates abandoned cart recovery email HTML."""
    item_rows = ""
    total = 0
    for item in cart_items:
        img_url = (
            item.product.image
            if getattr(item, "product", None) and getattr(item.product, "image", None)
            else "https://placehold.co/80?text=TRONIX365"
        )
        if img_url.startswith("/"):
            img_url = f"{frontend_url}{img_url}"

        price = (
            item.product.sale_price if item.product.sale_price else item.product.price
        )
        item_total = price * item.quantity
        total += item_total

        item_rows += f"""
        <tr>
            <td style="padding: 15px; border-bottom: 1px solid #eee;">
                <img src="{img_url}" alt="Product" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;" />
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: left;">
                <p style="margin: 0; font-weight: bold; color: #333;">{item.product.title}</p>
                <p style="margin: 5px 0 0; font-size: 13px; color: #666;">Qty: {item.quantity}</p>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">
                <p style="margin: 0; font-weight: bold; color: #333;">₹{item_total:,.2f}</p>
            </td>
        </tr>
        """

    cart_url = f"{frontend_url}/cart"

    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px; color: #333;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <tr>
                <td style="background-color: #f59e0b; padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">TRONIX365</h1>
                    <p style="color: #fef3c7; margin: 10px 0 0; font-size: 16px;">Don't leave these behind!</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px 20px;">
                    <h2 style="margin: 0 0 15px; font-size: 22px; color: #111827;">Hey {user_name},</h2>
                    <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.5;">
                        We noticed you left some great items in your cart. They are still reserved for you, but they might sell out soon! 
                        Come back and complete your purchase today.
                    </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 0 30px;">
                    <h3 style="margin: 0 0 15px; font-size: 18px; color: #111827; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Your Shopping Cart</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        {item_rows}
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px; text-align: right;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #111827;">Total: <span style="color: #f59e0b;">₹{total:,.2f}</span></p>
                </td>
            </tr>
            <tr>
                <td style="padding: 10px 30px 40px; text-align: center;">
                    <a href="{cart_url}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 16px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.25);">Return to Cart</a>
                </td>
            </tr>
            <tr>
                <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #64748b;">
                        Use code <strong style="color: #f59e0b;">WELCOME10</strong> for an extra 10% off!
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                        &copy; 2026 Tronix365. All rights reserved.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html_template


def send_abandoned_cart_email(user, cart_items):
    """Sends a recovery email for abandoned carts."""
    to_email = user.email
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    subject = "Forget something? Your cart is waiting at Tronix365"
    html_content = generate_abandoned_cart_html(
        getattr(user, "full_name", None) or "there", cart_items, frontend_url
    )

    return send_email_via_brevo(
        to_email,
        subject,
        html_content,
        sender_name="Tronix365 Re-engagement",
        status_trigger="abandoned_cart",
    )


def generate_otp_email_html(otp: str) -> str:
    """Generates a premium glassmorphic/neon HTML template for OTP emails."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0b14; margin: 0; padding: 40px 20px; color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #111122 0%, #1a1a36 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
            <!-- Header -->
            <tr>
                <td style="background: linear-gradient(90deg, #6d28d9 0%, #4f46e5 100%); padding: 35px 30px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 2px;">TRONIX365</h1>
                    <p style="color: #c7d2fe; margin: 5px 0 0; font-size: 14px; text-transform: uppercase; tracking: 0.1em;">Secure Authentication</p>
                </td>
            </tr>
            
            <!-- Body -->
            <tr>
                <td style="padding: 40px 30px 30px;">
                    <h2 style="margin: 0 0 20px; font-size: 20px; color: #ffffff; font-weight: 600;">Verification Code</h2>
                    <p style="margin: 0 0 30px; font-size: 15px; color: #9ca3af; line-height: 1.6;">
                        You requested a one-time verification code to sign in to your Tronix365 account. Use the code below to complete the authentication process.
                    </p>
                    
                    <!-- OTP Code Box -->
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
                        <span style="font-size: 12px; color: #818cf8; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; display: block; margin-bottom: 10px;">One-Time Password (OTP)</span>
                        <span style="font-size: 38px; font-weight: 800; color: #60a5fa; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">{otp}</span>
                    </div>
                    
                    <p style="margin: 0 0 20px; font-size: 14px; color: #f87171; line-height: 1.5; font-weight: 500;">
                        ⚠️ This code is active for exactly 2 minutes (120 seconds) and will automatically expire thereafter.
                    </p>
                    
                    <p style="margin: 0; font-size: 14px; color: #9ca3af; line-height: 1.6;">
                        If you did not request this code, please ignore this email or contact support if you suspect unauthorized access.
                    </p>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="background-color: #0d0d1a; padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                    <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280;">
                        This is an automated security notification. Please do not reply directly to this email.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #4b5563;">
                        &copy; 2026 Tronix365. All rights reserved.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def send_otp_email(email: str, otp: str):
    """Sends the OTP verification code to the user."""
    subject = f"{otp} is your Tronix365 Verification Code"
    html_content = generate_otp_email_html(otp)
    return send_email_via_brevo(
        email,
        subject,
        html_content,
        sender_name="Tronix365 Security",
        status_trigger="otp_verification",
    )
