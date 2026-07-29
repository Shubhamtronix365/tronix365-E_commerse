import os
import logging
import requests
from datetime import datetime
from typing import List, Union, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("email_utils")

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "shubham.tronix365@gmail.com")
MANDATORY_CC_EMAIL = "shubham.tronix365@gmail.com"


def log_email_to_db(
    order_id: Optional[int],
    recipient: str,
    subject: str,
    status_trigger: str,
    delivery_status: str,
    error_message: Optional[str] = None
):
    """
    Logs every email dispatch attempt to the database for auditability and compliance tracking.
    """
    from database import SessionLocal
    from models import EmailLogDB

    db = SessionLocal()
    try:
        log_entry = EmailLogDB(
            order_id=order_id,
            recipient=recipient,
            subject=subject,
            status_trigger=status_trigger,
            delivery_status=delivery_status,
            error_message=error_message,
            created_at=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record email audit log in database: {e}")
        db.rollback()
    finally:
        db.close()


def send_email_via_brevo(
    to_email: Union[str, List[str]],
    subject: str,
    html_content: str,
    sender_name: str = "Tronix365",
    sender_email: Optional[str] = None,
    reply_to: Optional[dict] = None,
    order_id: Optional[int] = None,
    status_trigger: str = "general"
) -> bool:
    """
    Dispatches email via Brevo REST API v3.
    MANDATORY REQUIREMENT: Always sends simultaneously to customer email and shubham.tronix365@gmail.com.
    """
    if not sender_email:
        sender_email = SENDER_EMAIL

    to_list = []
    if isinstance(to_email, list):
        for e in to_email:
            if e and str(e).strip():
                to_list.append({"email": str(e).strip()})
    elif to_email and str(to_email).strip():
        to_list.append({"email": str(to_email).strip()})

    # Ensure mandatory co-recipient is present
    has_mandatory = any(
        r.get("email", "").lower() == MANDATORY_CC_EMAIL.lower()
        for r in to_list
    )
    if not has_mandatory:
        to_list.append({"email": MANDATORY_CC_EMAIL})

    recipients_str = ", ".join([r["email"] for r in to_list])

    if not BREVO_API_KEY:
        msg = "BREVO_API_KEY environment variable not configured."
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
        res = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers=headers,
            timeout=10
        )
        res.raise_for_status()
        data = res.json()
        msg_id = data.get("messageId", "sent_ok")
        logger.info(f"Email sent successfully to [{recipients_str}]. Status: {status_trigger}, Message ID: {msg_id}")
        log_email_to_db(order_id, recipients_str, subject, status_trigger, "sent")
        return True
    except requests.exceptions.RequestException as e:
        err_msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            err_msg += f" | Brevo API Response: {e.response.text}"
        logger.error(f"Failed to send email via Brevo: {err_msg}")
        log_email_to_db(order_id, recipients_str, subject, status_trigger, "failed", err_msg)
        return False


def generate_order_status_email_html(order, status: str, frontend_url: str) -> str:
    """
    Generates dynamic, highly responsive HTML email templates for EVERY order status.
    Uses lightweight inline CSS and high-contrast typography to ensure instant rendering across desktop & mobile.
    """
    status_lower = (status or "pending").lower().strip()
    formatted_status = status_lower.replace("_", " ").title()

    raw_id = getattr(order, "id", 0)
    order_id_num = int(raw_id) if str(raw_id).isdigit() else 0
    order_id_str = f"{order_id_num:04d}" if order_id_num > 0 else str(raw_id)

    date_str = (
        order.created_at.strftime("%B %d, %Y %I:%M %p")
        if hasattr(order, "created_at") and hasattr(order.created_at, "strftime")
        else str(getattr(order, "created_at", "N/A")).split(".")[0].replace("T", " ")
    )

    customer_name = getattr(order, "full_name", None) or (
        order.customer_email.split("@")[0] if getattr(order, "customer_email", None) else "Valued Customer"
    )

    address_parts = [
        getattr(order, "address_line", None),
        getattr(order, "city", None),
        getattr(order, "state", None),
        f"PIN: {order.pincode}" if getattr(order, "pincode", None) else None,
    ]
    address_formatted = (
        ", ".join([p for p in address_parts if p]) if any(address_parts) else "N/A"
    )

    # Clean text brand badge
    logo_badge = f'''<span style="background-color: #6d28d9; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: 900; padding: 6px 12px; border-radius: 8px; display: inline-block; vertical-align: middle; letter-spacing: 0.5px;">⚡ TRONIX</span>'''

    order_items_list = getattr(order, "items", None) or []
    items_subtotal = sum(
        (getattr(item, "price_at_purchase", 0.0) or 0.0) * (getattr(item, "quantity", 1) or 1) for item in order_items_list
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

    total_amount = max(getattr(order, "total_amount", 0.0) or 0.0, 0.0)
    explicit_gst = getattr(order, "gst_amount", 0.0) or (total_amount - (total_amount / 1.18) if total_amount > 0 else 0.0)
    explicit_subtotal = getattr(order, "subtotal_before_gst", 0.0) or (total_amount - explicit_gst)
    cgst = explicit_gst / 2.0
    sgst = explicit_gst / 2.0

    # Build Item Rows
    item_rows = ""
    for item in order_items_list:
        p_obj = getattr(item, "product", None)
        img_url = (
            p_obj.image
            if p_obj and getattr(p_obj, "image", None)
            else "https://placehold.co/80?text=TRONIX365"
        )
        if img_url.startswith("/"):
            img_url = f"{frontend_url}{img_url}"

        title = p_obj.title if p_obj else "Electronics Item"
        unit_price = getattr(item, "price_at_purchase", 0.0) or 0.0
        qty = getattr(item, "quantity", 1) or 1
        line_total = unit_price * qty

        item_rows += f"""
        <tr>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f1f5f9; width: 56px; vertical-align: middle;">
                <img src="{img_url}" alt="{title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; display: block;" />
            </td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f1f5f9; text-align: left; vertical-align: middle;">
                <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px; line-height: 1.4;">{title}</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Qty: <strong style="color: #6d28d9;">{qty}</strong> &nbsp;|&nbsp; Price: ₹{unit_price:,.2f}</p>
            </td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: middle; width: 110px;">
                <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 15px;">₹{line_total:,.2f}</p>
            </td>
        </tr>
        """

    order_url = f"{frontend_url}/order/{order.id}"

    # Default Status Design Configurations
    cfg_map = {
        "pending": {
            "title": "Order Placed Successfully",
            "bg": "#fef3c7",
            "border": "#fde68a",
            "color": "#92400e",
            "badge_bg": "#fef3c7",
            "badge_color": "#b45309",
            "message": f"Hi <strong>{customer_name}</strong>, thank you for your order! Your purchase <strong>#order_tronix_{order_id_str}</strong> has been received and is pending verification.",
            "cta_text": "Track Order Status",
            "cta_url": order_url,
        },
        "confirmed": {
            "title": "Order Confirmed",
            "bg": "#ecfdf5",
            "border": "#a7f3d0",
            "color": "#065f46",
            "badge_bg": "#d1fae5",
            "badge_color": "#047857",
            "message": f"Hi <strong>{customer_name}</strong>, your purchase <strong>#order_tronix_{order_id_str}</strong> has been approved and is being prepared for packing.",
            "cta_text": "View Order Details",
            "cta_url": order_url,
        },
        "payment_received": {
            "title": "Payment Confirmed",
            "bg": "#ecfdf5",
            "border": "#a7f3d0",
            "color": "#065f46",
            "badge_bg": "#d1fae5",
            "badge_color": "#047857",
            "message": f"Hi <strong>{customer_name}</strong>, we have received your payment for order <strong>#order_tronix_{order_id_str}</strong>. Transaction ID: <strong>{getattr(order, 'txnid', 'Verified')}</strong>.",
            "cta_text": "Download Tax Invoice",
            "cta_url": order_url,
        },
        "processing": {
            "title": "Order Processing",
            "bg": "#eff6ff",
            "border": "#bfdbfe",
            "color": "#1e40af",
            "badge_bg": "#dbeafe",
            "badge_color": "#1d4ed8",
            "message": f"Hi <strong>{customer_name}</strong>, your order <strong>#order_tronix_{order_id_str}</strong> is currently being assembled and quality checked by our technical team.",
            "cta_text": "View Order Progress",
            "cta_url": order_url,
        },
        "packed": {
            "title": "Order Packed & Sealed",
            "bg": "#f0fdf4",
            "border": "#bbf7d0",
            "color": "#166534",
            "badge_bg": "#dcfce7",
            "badge_color": "#15803d",
            "message": f"Hi <strong>{customer_name}</strong>, your items for order <strong>#order_tronix_{order_id_str}</strong> are safely packed and ready for dispatch.",
            "cta_text": "Track Shipment",
            "cta_url": order_url,
        },
        "shipped": {
            "title": "Shipment Dispatched!",
            "bg": "#eff6ff",
            "border": "#bfdbfe",
            "color": "#1e40af",
            "badge_bg": "#dbeafe",
            "badge_color": "#1d4ed8",
            "message": f"Great news <strong>{customer_name}</strong>! Your order <strong>#order_tronix_{order_id_str}</strong> has been shipped via <strong>{getattr(order, 'courier', 'Courier Service')}</strong>.",
            "cta_text": "Track Package Live",
            "cta_url": order_url,
        },
        "out_for_delivery": {
            "title": "Out For Delivery Today!",
            "bg": "#faf5ff",
            "border": "#e9d5ff",
            "color": "#6b21a8",
            "badge_bg": "#f3e8ff",
            "badge_color": "#7e22ce",
            "message": f"Get ready <strong>{customer_name}</strong>! Your order <strong>#order_tronix_{order_id_str}</strong> is out for delivery today with our logistics partner.",
            "cta_text": "Track Delivery Arrival",
            "cta_url": order_url,
        },
        "delivered": {
            "title": "Order Delivered Successfully!",
            "bg": "#ecfdf5",
            "border": "#a7f3d0",
            "color": "#065f46",
            "badge_bg": "#d1fae5",
            "badge_color": "#047857",
            "message": f"Hi <strong>{customer_name}</strong>, your order <strong>#order_tronix_{order_id_str}</strong> has been delivered. Thank you for shopping with Tronix365!",
            "cta_text": "Write a Product Review",
            "cta_url": f"{frontend_url}/shop",
        },
        "cancelled": {
            "title": "Order Cancelled",
            "bg": "#fef2f2",
            "border": "#fecaca",
            "color": "#991b1b",
            "badge_bg": "#fee2e2",
            "badge_color": "#b91c1c",
            "message": f"Hi <strong>{customer_name}</strong>, your order <strong style='color: #dc2626;'>#order_tronix_{order_id_str}</strong> has been cancelled.",
            "cta_text": "Contact Support",
            "cta_url": f"{frontend_url}/contact",
        },
        "refund_initiated": {
            "title": "Refund Initiated",
            "bg": "#fff7ed",
            "border": "#ffedd5",
            "color": "#9a3412",
            "badge_bg": "#ffedd5",
            "badge_color": "#c2410c",
            "message": f"Hi <strong>{customer_name}</strong>, a refund for your order <strong>#order_tronix_{order_id_str}</strong> has been initiated.",
            "cta_text": "Check Refund Status",
            "cta_url": order_url,
        },
        "refund_completed": {
            "title": "Refund Completed",
            "bg": "#ecfdf5",
            "border": "#a7f3d0",
            "color": "#065f46",
            "badge_bg": "#d1fae5",
            "badge_color": "#047857",
            "message": f"Hi <strong>{customer_name}</strong>, your refund for order <strong>#order_tronix_{order_id_str}</strong> has been processed successfully.",
            "cta_text": "View Account Dashboard",
            "cta_url": f"{frontend_url}/dashboard",
        },
        "failed_payment": {
            "title": "Payment Failed",
            "bg": "#fef2f2",
            "border": "#fecaca",
            "color": "#991b1b",
            "badge_bg": "#fee2e2",
            "badge_color": "#b91c1c",
            "message": f"Hi <strong>{customer_name}</strong>, payment for your order <strong>#order_tronix_{order_id_str}</strong> could not be processed.",
            "cta_text": "Retry Payment",
            "cta_url": order_url,
        },
        "return_requested": {
            "title": "Return Request Received",
            "bg": "#fff7ed",
            "border": "#ffedd5",
            "color": "#9a3412",
            "badge_bg": "#ffedd5",
            "badge_color": "#c2410c",
            "message": f"Hi <strong>{customer_name}</strong>, we received your return request for order <strong>#order_tronix_{order_id_str}</strong> and are reviewing it.",
            "cta_text": "Track Return Status",
            "cta_url": order_url,
        },
        "return_approved": {
            "title": "Return Request Approved",
            "bg": "#ecfdf5",
            "border": "#a7f3d0",
            "color": "#065f46",
            "badge_bg": "#d1fae5",
            "badge_color": "#047857",
            "message": f"Hi <strong>{customer_name}</strong>, your return request for order <strong>#order_tronix_{order_id_str}</strong> has been approved. Pickup will be scheduled shortly.",
            "cta_text": "View Pickup Details",
            "cta_url": order_url,
        },
        "return_rejected": {
            "title": "Return Request Declined",
            "bg": "#fef2f2",
            "border": "#fecaca",
            "color": "#991b1b",
            "badge_bg": "#fee2e2",
            "badge_color": "#b91c1c",
            "message": f"Hi <strong>{customer_name}</strong>, your return request for order <strong>#order_tronix_{order_id_str}</strong> was reviewed and could not be approved.",
            "cta_text": "Contact Support Team",
            "cta_url": f"{frontend_url}/contact",
        },
        "exchange_approved": {
            "title": "Exchange Approved",
            "bg": "#ecfdf5",
            "border": "#a7f3d0",
            "color": "#065f46",
            "badge_bg": "#d1fae5",
            "badge_color": "#047857",
            "message": f"Hi <strong>{customer_name}</strong>, your exchange request for order <strong>#order_tronix_{order_id_str}</strong> has been approved.",
            "cta_text": "View Exchange Status",
            "cta_url": order_url,
        },
        "exchange_rejected": {
            "title": "Exchange Declined",
            "bg": "#fef2f2",
            "border": "#fecaca",
            "color": "#991b1b",
            "badge_bg": "#fee2e2",
            "badge_color": "#b91c1c",
            "message": f"Hi <strong>{customer_name}</strong>, your exchange request for order <strong>#order_tronix_{order_id_str}</strong> could not be approved.",
            "cta_text": "Contact Support",
            "cta_url": f"{frontend_url}/contact",
        },
    }

    cfg = cfg_map.get(status_lower, {
        "title": f"Order Status: {formatted_status}",
        "bg": "#f8fafc",
        "border": "#e2e8f0",
        "color": "#334155",
        "badge_bg": "#f1f5f9",
        "badge_color": "#475569",
        "message": f"Hi <strong>{customer_name}</strong>, your order <strong>#order_tronix_{order_id_str}</strong> status has been updated to <strong>{formatted_status}</strong>.",
        "cta_text": "View Order Status",
        "cta_url": order_url,
    })

    # Optional Shipping Details Card
    shipping_card_html = ""
    if getattr(order, "courier", None) or getattr(order, "tracking_number", None) or getattr(order, "estimated_delivery_date", None):
        shipping_card_html = f"""
        <tr>
            <td style="padding: 0 28px 20px;">
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                    <p style="margin: 0 0 10px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Logistics & Shipment Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #334155;">
                        <tr>
                            <td style="padding: 4px 0;"><strong>Shipping Partner:</strong> {getattr(order, 'courier', 'Courier Service')}</td>
                            <td style="padding: 4px 0; text-align: right;"><strong>Tracking #:</strong> <span style="color: #6d28d9; font-weight: 700;">{getattr(order, 'tracking_number', None) or 'Pending Generation'}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0;"><strong>Estimated Delivery:</strong> {getattr(order, 'estimated_delivery_date', None) or '3-5 Working Days'}</td>
                            <td style="padding: 4px 0; text-align: right;"><strong>Arrival Window:</strong> {getattr(order, 'estimated_arrival_time', None) or '9 AM - 7 PM'}</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
        """

    # Cancellation Reason & Refund Card
    cancellation_card_html = ""
    if status_lower in ["cancelled", "deleted", "refund_initiated", "refund_completed"]:
        reason = getattr(order, "cancellation_reason", None) or "Cancelled by Store Administrator"
        refund_msg = getattr(order, "refund_status", None) or "Full Refund Initiated (3-7 Working Days)"
        cancel_date = (
            order.cancellation_date.strftime("%B %d, %Y %I:%M %p")
            if hasattr(order, "cancellation_date") and hasattr(getattr(order, "cancellation_date", None), "strftime")
            else date_str
        )
        cancellation_card_html = f"""
        <tr>
            <td style="padding: 0 28px 20px;">
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px;">
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #991b1b; text-transform: uppercase;">Order Cancellation Summary</p>
                    <p style="margin: 0 0 4px; font-size: 13px; color: #7f1d1d;"><strong>Cancellation Date:</strong> {cancel_date}</p>
                    <p style="margin: 0 0 4px; font-size: 13px; color: #7f1d1d;"><strong>Reason:</strong> {reason}</p>
                    <p style="margin: 0; font-size: 13px; color: #7f1d1d;"><strong>Refund Status:</strong> <span style="color: #b91c1c; font-weight: 700;">{refund_msg}</span></p>
                </div>
            </td>
        </tr>
        """

    # Reason & Notes Card
    reason_card_html = ""
    if getattr(order, "return_reason", None) or getattr(order, "rejection_reason", None):
        r_text = getattr(order, "return_reason", None) or getattr(order, "rejection_reason", None)
        reason_card_html = f"""
        <tr>
            <td style="padding: 0 28px 20px;">
                <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 10px; padding: 14px 16px;">
                    <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #c2410c; text-transform: uppercase;">Status Notes</p>
                    <p style="margin: 0; font-size: 13px; color: #9a3412;">{r_text}</p>
                </div>
            </td>
        </tr>
        """

    # B2B GST Invoice Card
    gst_card_html = ""
    if getattr(order, "is_gst_invoice", False) and getattr(order, "gstin", None):
        gst_card_html = f"""
        <tr>
            <td style="padding: 0 28px 20px;">
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px;">
                    <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase;">Tax Invoice / B2B GST Details</p>
                    <p style="margin: 0 0 2px; font-size: 13px; color: #15803d;"><strong>Company Name:</strong> {getattr(order, 'company_name', 'N/A')}</p>
                    <p style="margin: 0; font-size: 13px; color: #15803d;"><strong>GSTIN:</strong> {getattr(order, 'gstin', 'N/A')}</p>
                </div>
            </td>
        </tr>
        """

    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{cfg['title']} - #order_tronix_{order_id_str}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 24px 12px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
                        
                        <!-- Header Section -->
                        <tr>
                            <td style="padding: 24px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="left">
                                            {logo_badge}
                                            <span style="font-size: 18px; font-weight: 800; color: #0f172a; margin-left: 8px; vertical-align: middle;">Tronix365</span>
                                        </td>
                                        <td align="right">
                                            <span style="display: inline-block; background-color: {cfg['badge_bg']}; color: {cfg['badge_color']}; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                                                {formatted_status}
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

                        {shipping_card_html}
                        {cancellation_card_html}
                        {reason_card_html}
                        {gst_card_html}

                        <!-- Delivery & Order Info Grid -->
                        <tr>
                            <td style="padding: 20px 28px 12px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
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
                                            <p style="margin: 0 0 2px; font-size: 13px; color: #374151;"><strong>Order ID:</strong> #order_tronix_{order_id_str}</p>
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
                                    Items Ordered ({len(order_items_list)})
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
                                            <td style="padding-top: 10px; border-top: 2px solid #e5e7eb; font-size: 18px; color: #6d28d9; text-align: right; font-weight: 900;">₹{total_amount:,.2f}</td>
                                        </tr>
                                    </table>
                                </div>
                            </td>
                        </tr>

                        <!-- Authenticity Card -->
                        <tr>
                            <td style="padding: 0 28px 24px;">
                                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px;">
                                    <p style="margin: 0 0 4px; font-size: 13px; color: #15803d; font-weight: 700;">
                                        🛡️ 100% Verified Authentic Hardware
                                    </p>
                                    <p style="margin: 0; font-size: 12px; color: #166534; line-height: 1.4;">
                                        All electronic products sold by Tronix365 are original and checked for quality assurance. Need assistance? Contact our customer support.
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
                            <td style="background-color: #0f172a; padding: 28px; text-align: center; color: #94a3b8; font-size: 13px;">
                                <p style="margin: 0 0 8px; font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">TRONIX365</p>
                                <p style="margin: 0 0 12px; color: #cbd5e1; font-size: 12px;">Your Trusted Store for Robotics & Industrial Electronic Components</p>
                                <div style="margin-bottom: 16px;">
                                    <a href="{frontend_url}" style="color: #a78bfa; text-decoration: none; margin: 0 8px; font-weight: 600;">Website</a> &bull;
                                    <a href="{frontend_url}/contact" style="color: #a78bfa; text-decoration: none; margin: 0 8px; font-weight: 600;">Support</a> &bull;
                                    <a href="mailto:shubham.tronix365@gmail.com" style="color: #a78bfa; text-decoration: none; margin: 0 8px; font-weight: 600;">Email Us</a>
                                </div>
                                <p style="margin: 0; font-size: 11px; color: #64748b;">
                                    © {datetime.now().year} Tronix365. All Rights Reserved.<br>
                                    Need help? Contact support at <a href="mailto:shubham.tronix365@gmail.com" style="color: #a78bfa;">shubham.tronix365@gmail.com</a>
                                </p>
                            </td>
                        </tr>

                    </table>
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
    1. Automatic deduplication check against recent email logs (60 seconds window).
    2. Dedicated HTML template generation per status.
    3. Mandatory delivery to both customer and shubham.tronix365@gmail.com.
    """
    from database import SessionLocal
    from models import OrderDB, OrderItemDB, EmailLogDB
    from sqlalchemy.orm import joinedload

    order_id = order_or_id if isinstance(order_or_id, int) else getattr(order_or_id, "id", None)
    if not order_id:
        logger.error("Invalid order_id provided to send_order_status_email.")
        return False

    status_lower = (status or "pending").lower().strip()

    db = SessionLocal()
    try:
        # Check deduplication within 60 seconds
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
            logger.error(f"Order ID {order_id} not found in database. Cannot send notification email.")
            return False

        to_email = order_loaded.customer_email
        if not to_email:
            logger.error(f"Order #{order_loaded.id} has no customer_email. Cannot send notification.")
            return False

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        if ("tronix365.in" in frontend_url or "tronix.in" in frontend_url) and "/e-commerse" not in frontend_url:
            frontend_url = f"{frontend_url}/e-commerse"

        formatted_status = status_lower.replace("_", " ").title()
        raw_id_sub = getattr(order_loaded, "id", 0)
        order_id_num_sub = int(raw_id_sub) if str(raw_id_sub).isdigit() else 0
        order_id_str_sub = f"{order_id_num_sub:04d}" if order_id_num_sub > 0 else str(raw_id_sub)
        subject = f"Order #{order_id_str_sub} Update: {formatted_status} - Tronix365"

        html_content = generate_order_status_email_html(order_loaded, status_lower, frontend_url)

        return send_email_via_brevo(
            to_email,
            subject,
            html_content,
            sender_name="Tronix365 Orders",
            order_id=order_loaded.id,
            status_trigger=status_lower,
        )
    except Exception as e:
        logger.error(f"Failed to dispatch order status email for order #{order_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False
    finally:
        db.close()


def send_order_confirmation_email(order):
    return send_order_status_email(order, "confirmed")


def send_otp_email(to_email: str, otp_code: str):
    """
    Sends an OTP verification email for account registration or password reset.
    Always sends to customer + shubham.tronix365@gmail.com.
    """
    subject = f"Your Tronix365 Verification Code: {otp_code}"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Tronix365 OTP Code</title></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 24px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="background-color: #6d28d9; color: #ffffff; font-size: 16px; font-weight: 900; padding: 6px 12px; border-radius: 8px;">⚡ TRONIX365</span>
            </div>
            <h2 style="color: #111827; text-align: center; margin-bottom: 10px;">Verification Code</h2>
            <p style="color: #4b5563; text-align: center; font-size: 14px;">Use the following 6-digit OTP code to complete your verification:</p>
            <div style="background: #f3f4f6; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #6d28d9; padding: 16px; border-radius: 10px; margin: 20px 0;">
                {otp_code}
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">This code will expire in 10 minutes. Please do not share it with anyone.</p>
        </div>
    </body>
    </html>
    """
    return send_email_via_brevo(to_email, subject, html_content, sender_name="Tronix365 Security", status_trigger="otp_verification")


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


def generate_abandoned_cart_html(user_name: str, cart_items: list, frontend_url: str) -> str:
    item_rows = ""
    total = 0.0
    for item in (cart_items or []):
        p_obj = getattr(item, "product", None)
        title = p_obj.title if p_obj else "Product"
        price = getattr(item, "price_at_purchase", 0.0) or getattr(p_obj, "price", 0.0) or 0.0
        qty = getattr(item, "quantity", 1) or 1
        line_total = price * qty
        total += line_total
        item_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{title} (x{qty})</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹{line_total:,.2f}</td>
        </tr>
        """
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #6d28d9;">Complete Your Purchase at Tronix365</h2>
            <p>Hi {user_name}, you left some great items in your shopping cart!</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">{item_rows}</table>
            <p><strong>Total: ₹{total:,.2f}</strong></p>
            <a href="{frontend_url}/cart" style="display: inline-block; background: #6d28d9; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Checkout Now</a>
        </div>
    </body>
    </html>
    """


def send_abandoned_cart_email(to_email: str, user_name: str, cart_items: list, frontend_url: str):
    subject = "Items Left in Your Cart - Complete Your Order at Tronix365"
    html_content = generate_abandoned_cart_html(user_name, cart_items, frontend_url)
    return send_email_via_brevo(to_email, subject, html_content, sender_name="Tronix365 Support", status_trigger="abandoned_cart")

