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


# Public URL base for hosted email assets (logo, icons)
EMAIL_ASSETS_BASE_URL = os.getenv("BACKEND_URL", "https://tronix365-e-commerse.onrender.com") + "/email-assets"
LOGO_PUBLIC_URL = os.getenv("EMAIL_LOGO_URL", "https://tronix365-e-commerse.onrender.com/email-assets/logo.png")


def slugify(text: str) -> str:
    if not text:
        return ""
    import re
    text = str(text).lower().strip()
    text = text.replace("_", "-")
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"[^\w\-]+", "", text)
    text = re.sub(r"\-\-+", "-", text)
    return text.strip("-")


def get_canonical_frontend_url(url_str: Optional[str] = None) -> str:
    """
    Returns the canonical frontend base URL with /e-commerse route guaranteed.
    Prevents Vite base URL mismatch error (e.g. 'did you mean to visit /e-commerse/shop').
    """
    base = (url_str or os.getenv("FRONTEND_URL", "https://www.tronix365.in/e-commerse")).rstrip("/")
    if "/e-commerse" not in base:
        base = f"{base}/e-commerse"
    return base


def resolve_email_image_url(raw_img_url: Optional[str], frontend_url: str) -> str:
    """
    Resolves product or asset image URLs to 100% public, HTTPS-accessible URLs for email clients.
    Encodes spaces and special characters so Gmail proxy never fails to render.
    """
    import urllib.parse
    backend_base = os.getenv("BACKEND_URL", "https://tronix365-e-commerse.onrender.com").rstrip("/")
    logo_cdn = LOGO_PUBLIC_URL

    if not raw_img_url or not isinstance(raw_img_url, str):
        return logo_cdn

    url = raw_img_url.strip()
    if not url or "placehold.co" in url or "placeholder" in url:
        return logo_cdn

    # Replace localhost/127.0.0.1 in image URLs with backend public URL
    if "localhost:" in url or "127.0.0.1:" in url:
        import re
        match = re.search(r"https?://[^/]+(/.*)", url)
        if match:
            url = match.group(1)

    if url.startswith("/uploads/") or url.startswith("uploads/"):
        rel_path = url if url.startswith("/") else f"/{url}"
        full_url = f"{backend_base}{rel_path}"
        return urllib.parse.quote(full_url, safe="/:?=&")

    if url.startswith("/assets/") or url.startswith("assets/"):
        rel_path = url if url.startswith("/") else f"/{url}"
        full_url = f"{frontend_url}{rel_path}"
        return urllib.parse.quote(full_url, safe="/:?=&")

    if url.startswith("/"):
        full_url = f"{frontend_url}{url}"
        return urllib.parse.quote(full_url, safe="/:?=&")

    if url.startswith("http://") or url.startswith("https://"):
        return urllib.parse.quote(url, safe="/:?=&")

    return logo_cdn


def generate_order_status_email_html(order, status: str, frontend_url: str = None) -> str:
    """
    Generates dynamic, highly responsive HTML email templates for EVERY order status.
    Uses high-availability jsDelivr CDN logo image matching the confirmation.png design.
    """
    frontend_url = get_canonical_frontend_url(frontend_url)
    status_lower = (status or "pending").lower().strip()
    formatted_status = status_lower.replace("_", " ").title()

    raw_id = getattr(order, "id", 0)
    order_id_num = int(raw_id) if str(raw_id).isdigit() else 0
    order_id_str = f"{order_id_num:04d}" if order_id_num > 0 else str(raw_id)

    date_str = (
        order.created_at.strftime("%B %d, %Y")
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
        f"- {order.pincode}" if getattr(order, "pincode", None) else None,
    ]
    address_formatted = (
        ", ".join([p for p in address_parts if p]) if any(address_parts) else "N/A"
    )

    # Hosted logo image — high availability public CDN with fallback text
    logo_url = LOGO_PUBLIC_URL
    logo_html = f'''<a href="{frontend_url}" style="text-decoration: none; display: inline-flex; align-items: center;"><img src="{logo_url}" alt="TRONIX365" width="42" height="42" style="display: inline-block; border: 0; outline: none; vertical-align: middle; border-radius: 8px;" /><span style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 1px; vertical-align: middle; margin-left: 8px;">TRONIX<span style="color: #6d28d9;">365</span></span></a>'''

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

    # Build Item Rows with Clickable Slug Links and Visible Upload Images
    item_rows = ""
    for item in order_items_list:
        p_obj = getattr(item, "product", None)
        title = getattr(p_obj, "title", "Electronics Item") if p_obj else "Electronics Item"
        prod_slug = getattr(p_obj, "slug", None) or slugify(title) or getattr(p_obj, "id", None) or getattr(item, "product_id", None)
        if prod_slug:
            product_url = f"{frontend_url}/product/{prod_slug}"
        else:
            product_url = f"{frontend_url}/shop"

        raw_img = getattr(p_obj, "image", None) if p_obj else None
        img_url = resolve_email_image_url(raw_img, frontend_url)

        title = getattr(p_obj, "title", "Electronics Item") if p_obj else "Electronics Item"
        unit_price = getattr(item, "price_at_purchase", 0.0) or 0.0
        qty = getattr(item, "quantity", 1) or 1
        line_total = unit_price * qty

        item_rows += f"""
        <tr>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f1f5f9; width: 56px; vertical-align: middle;">
                <a href="{product_url}" style="text-decoration: none; display: block;">
                    <img src="{img_url}" alt="{title}" width="50" height="50" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; display: block;" />
                </a>
            </td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f1f5f9; text-align: left; vertical-align: middle;">
                <a href="{product_url}" style="text-decoration: none; color: #0f172a;">
                    <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px; line-height: 1.4;">{title}</p>
                </a>
                <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Qty: <strong style="color: #6d28d9;">{qty}</strong> &nbsp;|&nbsp; Price: ₹{unit_price:,.2f}</p>
            </td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: middle; width: 110px;">
                <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 15px;">₹{line_total:,.2f}</p>
            </td>
        </tr>
        """

    order_url = f"{frontend_url}/order/{order_id_num}" if order_id_num > 0 else f"{frontend_url}/dashboard"
    order_link_html = f'''<a href="{order_url}" target="_blank" style="color: #6d28d9; text-decoration: underline; font-weight: 800;">#order_tronix_{order_id_str}</a>'''

    # Per-status icon (inline SVG emoji fallback circles matching confirmation.png design)
    status_icon_map = {
        "pending":           ("⏳", "#f59e0b", "#fffbeb"),
        "confirmed":         ("✅", "#16a34a", "#f0fdf4"),
        "payment_received":  ("💳", "#16a34a", "#f0fdf4"),
        "processing":        ("⚙️", "#2563eb", "#eff6ff"),
        "packed":            ("📦", "#7c3aed", "#f5f3ff"),
        "shipped":           ("🚚", "#2563eb", "#eff6ff"),
        "out_for_delivery":  ("🛵", "#7c3aed", "#faf5ff"),
        "delivered":         ("✅", "#16a34a", "#f0fdf4"),
        "cancelled":         ("❌", "#dc2626", "#fef2f2"),
        "refund_initiated":  ("₹", "#7c3aed", "#faf5ff"),
        "refund_completed":  ("✅", "#16a34a", "#f0fdf4"),
        "failed_payment":    ("⚠️", "#dc2626", "#fef2f2"),
        "return_requested":  ("↩️", "#d97706", "#fffbeb"),
        "return_approved":   ("✅", "#16a34a", "#f0fdf4"),
        "return_rejected":   ("❌", "#dc2626", "#fef2f2"),
        "exchange_approved": ("🔄", "#16a34a", "#f0fdf4"),
        "exchange_rejected": ("❌", "#dc2626", "#fef2f2"),
    }
    s_icon, s_icon_color, s_icon_bg = status_icon_map.get(status_lower, ("📋", "#6d28d9", "#f5f3ff"))

    # Default Status Design Configurations
    cfg_map = {
        "pending": {
            "title": "Order Placed Successfully",
            "bg": "#fef3c7",
            "border": "#fde68a",
            "color": "#92400e",
            "badge_bg": "#fef3c7",
            "badge_color": "#b45309",
            "message": f"Hi <strong>{customer_name}</strong>, thank you for your order! Your purchase {order_link_html} has been received and is pending verification.",
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
            "message": f"Hi <strong>{customer_name}</strong>, your purchase {order_link_html} has been approved and is being prepared for packing.",
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
            "message": f"Hi <strong>{customer_name}</strong>, we have received your payment for order {order_link_html}. Transaction ID: <strong>{getattr(order, 'txnid', 'Verified')}</strong>.",
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
            "message": f"Hi <strong>{customer_name}</strong>, your order {order_link_html} is currently being assembled and quality checked by our technical team.",
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
            "message": f"Hi <strong>{customer_name}</strong>, your items for order {order_link_html} are safely packed and ready for dispatch.",
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
            "message": f"Great news <strong>{customer_name}</strong>! Your order {order_link_html} has been shipped via <strong>{getattr(order, 'courier', 'Courier Service')}</strong>.",
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
            "message": f"Get ready <strong>{customer_name}</strong>! Your order {order_link_html} is out for delivery today with our logistics partner.",
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
            "message": f"Hi <strong>{customer_name}</strong>, your order {order_link_html} has been delivered. Thank you for shopping with Tronix365!",
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
            "message": f"Hi <strong>{customer_name}</strong>, your order {order_link_html} has been cancelled.",
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
            "message": f"Hi <strong>{customer_name}</strong>, a refund for your order {order_link_html} has been initiated.",
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
            "message": f"Hi <strong>{customer_name}</strong>, your refund for order {order_link_html} has been processed successfully.",
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

    # Real-Time Visual Progress Bar
    progress_bar_html = f"""
    <tr>
        <td style="padding: 20px 28px 10px;">
            <a href="{order_url}" target="_blank" style="text-decoration: none; display: block;">
                <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 16px 12px; text-align: center; box-shadow: 0 2px 8px rgba(109, 40, 217, 0.05);">
                    <p style="margin: 0 0 12px; font-size: 11px; font-weight: 800; color: #6d28d9; text-transform: uppercase; letter-spacing: 1px; background-color: #ffffff; display: inline-block; padding: 4px 12px; border-radius: 12px; border: 1px solid #ddd6fe;">
                        ⚡ Real-Time Order Tracking (Click to View Live Map)
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
                        <tr>
                            <td align="center" style="vertical-align: top; padding: 0 2px;">
                                <div style="width: 28px; height: 28px; border-radius: 50%; background-color: {'#16a34a' if status_lower in ['confirmed','payment_received','processing','packed','shipped','out_for_delivery','delivered'] else '#6d28d9'}; color: #ffffff; font-size: 12px; line-height: 28px; font-weight: 900; margin: 0 auto 6px auto; text-align: center;">✓</div>
                                <span style="font-size: 11px; font-weight: 700; color: #16a34a; display: block; line-height: 1.2;">Placed</span>
                            </td>
                            <td align="center" style="vertical-align: top; padding: 0 2px;">
                                <div style="width: 28px; height: 28px; border-radius: 50%; background-color: {'#16a34a' if status_lower in ['processing','packed','shipped','out_for_delivery','delivered'] else ('#6d28d9' if status_lower in ['confirmed','payment_received'] else '#f1f5f9')}; color: {'#ffffff' if status_lower in ['confirmed','payment_received','processing','packed','shipped','out_for_delivery','delivered'] else '#94a3b8'}; border: 1px solid {'#16a34a' if status_lower in ['processing','packed','shipped','out_for_delivery','delivered'] else ('#6d28d9' if status_lower in ['confirmed','payment_received'] else '#cbd5e1')}; font-size: 12px; line-height: 28px; font-weight: 900; margin: 0 auto 6px auto; text-align: center;">{'✓' if status_lower in ['processing','packed','shipped','out_for_delivery','delivered'] else '2'}</div>
                                <span style="font-size: 11px; font-weight: {'800' if status_lower in ['confirmed','payment_received'] else ('700' if status_lower in ['processing','packed','shipped','out_for_delivery','delivered'] else '500')}; color: {'#6d28d9' if status_lower in ['confirmed','payment_received'] else ('#16a34a' if status_lower in ['processing','packed','shipped','out_for_delivery','delivered'] else '#94a3b8')}; display: block; line-height: 1.2;">Confirmed</span>
                            </td>
                            <td align="center" style="vertical-align: top; padding: 0 2px;">
                                <div style="width: 28px; height: 28px; border-radius: 50%; background-color: {'#16a34a' if status_lower in ['shipped','out_for_delivery','delivered'] else ('#6d28d9' if status_lower in ['processing','packed'] else '#f1f5f9')}; color: {'#ffffff' if status_lower in ['processing','packed','shipped','out_for_delivery','delivered'] else '#94a3b8'}; border: 1px solid {'#16a34a' if status_lower in ['shipped','out_for_delivery','delivered'] else ('#6d28d9' if status_lower in ['processing','packed'] else '#cbd5e1')}; font-size: 12px; line-height: 28px; font-weight: 900; margin: 0 auto 6px auto; text-align: center;">{'✓' if status_lower in ['shipped','out_for_delivery','delivered'] else '3'}</div>
                                <span style="font-size: 11px; font-weight: {'800' if status_lower in ['processing','packed'] else ('700' if status_lower in ['shipped','out_for_delivery','delivered'] else '500')}; color: {'#6d28d9' if status_lower in ['processing','packed'] else ('#16a34a' if status_lower in ['shipped','out_for_delivery','delivered'] else '#94a3b8')}; display: block; line-height: 1.2;">Packed</span>
                            </td>
                            <td align="center" style="vertical-align: top; padding: 0 2px;">
                                <div style="width: 28px; height: 28px; border-radius: 50%; background-color: {'#16a34a' if status_lower == 'delivered' else ('#6d28d9' if status_lower in ['shipped','out_for_delivery'] else '#f1f5f9')}; color: {'#ffffff' if status_lower in ['shipped','out_for_delivery','delivered'] else '#94a3b8'}; border: 1px solid {'#16a34a' if status_lower == 'delivered' else ('#6d28d9' if status_lower in ['shipped','out_for_delivery'] else '#cbd5e1')}; font-size: 12px; line-height: 28px; font-weight: 900; margin: 0 auto 6px auto; text-align: center;">{'✓' if status_lower == 'delivered' else '4'}</div>
                                <span style="font-size: 11px; font-weight: {'800' if status_lower in ['shipped','out_for_delivery'] else ('700' if status_lower == 'delivered' else '500')}; color: {'#6d28d9' if status_lower in ['shipped','out_for_delivery'] else ('#16a34a' if status_lower == 'delivered' else '#94a3b8')}; display: block; line-height: 1.2;">Shipped</span>
                            </td>
                            <td align="center" style="vertical-align: top; padding: 0 2px;">
                                <div style="width: 28px; height: 28px; border-radius: 50%; background-color: {'#16a34a' if status_lower == 'delivered' else '#f1f5f9'}; color: {'#ffffff' if status_lower == 'delivered' else '#94a3b8'}; border: 1px solid {'#16a34a' if status_lower == 'delivered' else '#cbd5e1'}; font-size: 12px; line-height: 28px; font-weight: 900; margin: 0 auto 6px auto; text-align: center;">{'✓' if status_lower == 'delivered' else '5'}</div>
                                <span style="font-size: 11px; font-weight: {'800' if status_lower == 'delivered' else '500'}; color: {'#16a34a' if status_lower == 'delivered' else '#94a3b8'}; display: block; line-height: 1.2;">Delivered</span>
                            </td>
                        </tr>
                    </table>
                </div>
            </a>
        </td>
    </tr>
    """

    # Optional Shipping Details Card
    shipping_card_html = ""
    if getattr(order, "courier", None) or getattr(order, "tracking_number", None) or getattr(order, "estimated_delivery_date", None):
        t_num = getattr(order, 'tracking_number', None)
        c_name = getattr(order, 'courier', 'Delhivery Express') or 'Delhivery Express'
        if t_num:
            t_url = f"https://www.delhivery.com/track/package/{t_num}" if "delhivery" in c_name.lower() else order_url
            t_link = f'<a href="{t_url}" target="_blank" style="color: #6d28d9; text-decoration: underline; font-weight: 800;">{t_num}</a>'
        else:
            t_link = '<span style="color: #94a3b8; font-weight: 600;">Pending Generation</span>'

        shipping_card_html = f"""
        <tr>
            <td style="padding: 0 28px 20px;">
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                    <p style="margin: 0 0 10px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Logistics & Shipment Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #334155;">
                        <tr>
                            <td style="padding: 4px 0;"><strong>Shipping Partner:</strong> {c_name}</td>
                            <td style="padding: 4px 0; text-align: right;"><strong>Tracking #:</strong> {t_link}</td>
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
        <title>{cfg['title']} - #TRX{order_id_str}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 28px 12px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">

                        <!-- Logo Header -->
                        <tr>
                            <td style="padding: 20px 28px; background-color: #ffffff; border-bottom: 2px solid #f1f5f9; text-align: left;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="left" style="vertical-align: middle;">
                                            {logo_html}
                                        </td>
                                        <td align="right" style="vertical-align: middle;">
                                            <span style="display: inline-block; background-color: {cfg['badge_bg']}; color: {cfg['badge_color']}; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid {cfg['border']};">
                                                {formatted_status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Status Icon + Hero Heading -->
                        <tr>
                            <td style="background-color: {cfg['bg']}; padding: 28px 28px 24px; text-align: center; border-bottom: 1px solid {cfg['border']};">
                                <div style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; background-color: {s_icon_bg}; border: 2px solid {s_icon_color}; text-align: center; line-height: 60px; font-size: 28px; margin-bottom: 14px;">{s_icon}</div>
                                <h1 style="margin: 0 0 10px; font-size: 22px; color: {cfg['color']}; font-weight: 900; letter-spacing: -0.3px;">{cfg['title']}</h1>
                                <p style="margin: 0 auto; font-size: 14px; color: #374151; line-height: 1.6; max-width: 460px;">
                                    {cfg['message']}
                                </p>
                            </td>
                        </tr>

                        {progress_bar_html}
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
                                            <p style="margin: 0 0 2px; font-size: 13px; color: #374151;"><strong>Order ID:</strong> {order_link_html}</p>
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

                        <!-- Dark Footer matching confirmation.png design -->
                        <tr>
                            <td style="background-color: #111827; padding: 28px 24px; text-align: center;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="padding-bottom: 16px;">
                                            <a href="{frontend_url}" style="text-decoration: none; display: inline-block;">
                                                <img src="{logo_url}" alt="TRONIX365" width="48" height="48" style="display: block; margin: 0 auto 6px auto; border: 0; outline: none;" />
                                                <span style="font-family: Arial, sans-serif; font-size: 15px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">TRONIX<span style="color: #a78bfa;">365</span></span>
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-bottom: 6px;">
                                            <span style="font-size: 11px; color: #9ca3af; letter-spacing: 0.5px;">Need Help?</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-bottom: 4px;">
                                            <a href="mailto:admin@tronix365.in" style="color: #a78bfa; font-size: 13px; text-decoration: none; font-weight: 600;">✉ admin@tronix365.in</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-bottom: 4px;">
                                            <a href="tel:+918830153805" style="color: #9ca3af; font-size: 13px; text-decoration: none;">📞 +91 88301 53805</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-bottom: 20px;">
                                            <a href="{frontend_url}" style="color: #a78bfa; font-size: 13px; text-decoration: none; font-weight: 600;">🌐 www.tronix365.in</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="border-top: 1px solid #1f2937; padding-top: 16px;">
                                            <p style="margin: 0; font-size: 11px; color: #4b5563;">© {datetime.now().year} Tronix365. All rights reserved.</p>
                                        </td>
                                    </tr>
                                </table>
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


def send_order_status_email(order_or_id, status: str, force_send: bool = False):
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
        # Check deduplication within 60 seconds (bypassed if force_send is True)
        if not force_send:
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
                if 0 <= time_diff < 60:
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
            if hasattr(order_or_id, "customer_email"):
                order_loaded = order_or_id
            else:
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
    frontend_url = get_canonical_frontend_url()
    logo_url = LOGO_PUBLIC_URL

    subject = f"Your Tronix365 Verification Code: {otp_code}"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Tronix365 OTP Code</title></head>
    <body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <div style="max-width: 520px; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                        
                        <!-- Header Logo -->
                        <div style="padding: 20px 24px; border-bottom: 2px solid #f1f5f9; text-align: left;">
                            <a href="{frontend_url}" style="text-decoration: none; display: inline-flex; align-items: center;">
                                <img src="{logo_url}" alt="TRONIX365" width="42" height="42" style="display: inline-block; border: 0; outline: none; vertical-align: middle; border-radius: 8px;" />
                                <span style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 1px; vertical-align: middle; margin-left: 8px;">TRONIX<span style="color: #6d28d9;">365</span></span>
                            </a>
                        </div>

                        <!-- Main Body -->
                        <div style="padding: 32px 28px; text-align: center;">
                            <div style="display: inline-block; background-color: #f3e8ff; color: #7e22ce; font-size: 24px; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; margin-bottom: 16px;">🔐</div>
                            <h2 style="color: #0f172a; margin: 0 0 10px; font-weight: 800; font-size: 22px;">Verification Code</h2>
                            <p style="color: #475569; font-size: 14px; margin: 0 0 24px; line-height: 1.5;">Use the following 6-digit OTP code to complete your security verification:</p>
                            
                            <div style="background: #f8fafc; border: 2px dashed #8b5cf6; text-align: center; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #6d28d9; padding: 18px; border-radius: 12px; margin: 0 0 24px;">
                                {otp_code}
                            </div>
                            
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">This code will expire in 10 minutes. Please do not share it with anyone.</p>
                        </div>

                        <!-- Dark Footer -->
                        <div style="background-color: #111827; padding: 24px; text-align: center;">
                            <a href="{frontend_url}" style="text-decoration: none;">
                                <img src="{logo_url}" alt="TRONIX365" width="40" height="40" style="display: block; margin: 0 auto 6px auto; border: 0;" />
                                <span style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">TRONIX<span style="color: #a78bfa;">365</span></span>
                            </a>
                            <p style="margin: 8px 0 0; font-size: 11px; color: #6b7280;">© {datetime.now().year} Tronix365. All rights reserved.</p>
                        </div>

                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return send_email_via_brevo(to_email, subject, html_content, sender_name="Tronix365 Security", status_trigger="otp_verification")


def send_contact_form_notification(name: str, email: str, message: str):
    """
    Sends a notification to the admin/support email when a contact form is submitted.
    """
    to_email = os.getenv("CONTACT_EMAIL", MANDATORY_CC_EMAIL)
    frontend_url = get_canonical_frontend_url()
    logo_url = LOGO_PUBLIC_URL

    subject = f"New Contact Message from {name}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>New Contact Message</title></head>
    <body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; margin: 0; color: #333;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <div style="max-width: 580px; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                        
                        <!-- Header Logo -->
                        <div style="padding: 20px 28px; border-bottom: 2px solid #f1f5f9; text-align: left;">
                            <a href="{frontend_url}" style="text-decoration: none; display: inline-flex; align-items: center;">
                                <img src="{logo_url}" alt="TRONIX365" width="42" height="42" style="display: inline-block; border: 0; outline: none; vertical-align: middle; border-radius: 8px;" />
                                <span style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 1px; vertical-align: middle; margin-left: 8px;">TRONIX<span style="color: #6d28d9;">365</span></span>
                            </a>
                        </div>

                        <!-- Body -->
                        <div style="padding: 28px;">
                            <h2 style="color: #6d28d9; margin: 0 0 16px; font-size: 20px; border-bottom: 2px solid #f3e8ff; padding-bottom: 8px;">📬 New Website Inquiry</h2>
                            <p style="margin: 6px 0; font-size: 14px;"><strong>Name:</strong> {name}</p>
                            <p style="margin: 6px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:{email}" style="color: #6d28d9;">{email}</a></p>
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0 0 6px; font-weight: 700; color: #475569; font-size: 13px; text-transform: uppercase;">Message Content:</p>
                                <p style="white-space: pre-wrap; margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6;">{message}</p>
                            </div>
                        </div>

                        <!-- Dark Footer -->
                        <div style="background-color: #111827; padding: 24px; text-align: center;">
                            <a href="{frontend_url}" style="text-decoration: none;">
                                <img src="{logo_url}" alt="TRONIX365" width="40" height="40" style="display: block; margin: 0 auto 6px auto; border: 0;" />
                                <span style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">TRONIX<span style="color: #a78bfa;">365</span></span>
                            </a>
                            <p style="margin: 8px 0 0; font-size: 11px; color: #6b7280;">© {datetime.now().year} Tronix365 Contact System.</p>
                        </div>

                    </div>
                </td>
            </tr>
        </table>
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


def generate_abandoned_cart_html(user_name: str, cart_items: list, frontend_url: str = None) -> str:
    frontend_url = get_canonical_frontend_url(frontend_url)
    logo_url = LOGO_PUBLIC_URL
    
    item_rows = ""
    total = 0.0
    for item in (cart_items or []):
        if isinstance(item, dict):
            title = item.get("title", "Product")
            price = float(item.get("price", 0.0))
            qty = int(item.get("quantity", 1))
            prod_id = item.get("id") or item.get("product_id")
            raw_img = item.get("image")
        else:
            p_obj = getattr(item, "product", None)
            title = p_obj.title if p_obj else "Product"
            price = getattr(item, "price_at_purchase", 0.0) or getattr(p_obj, "price", 0.0) or 0.0
            qty = getattr(item, "quantity", 1) or 1
            prod_id = getattr(p_obj, "id", None) or getattr(item, "product_id", None)
            raw_img = getattr(p_obj, "image", None) if p_obj else None

        img_url = resolve_email_image_url(raw_img, frontend_url)

        prod_slug = item.get("slug") if isinstance(item, dict) else (getattr(p_obj, "slug", None) if p_obj else None)
        if not prod_slug:
            prod_slug = slugify(title) or prod_id
        if prod_slug:
            product_url = f"{frontend_url}/product/{prod_slug}"
        else:
            product_url = f"{frontend_url}/shop"

        line_total = price * qty
        total += line_total
        item_rows += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; width: 50px; vertical-align: middle;">
                <a href="{product_url}" style="text-decoration: none; display: block;">
                    <img src="{img_url}" alt="{title}" width="44" height="44" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; display: block;" />
                </a>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
                <a href="{product_url}" style="text-decoration: none; color: #0f172a;">
                    <p style="margin: 0; font-weight: 700; font-size: 14px; color: #0f172a;">{title}</p>
                </a>
                <p style="margin: 3px 0 0; font-size: 12px; color: #64748b;">Qty: {qty} &nbsp;|&nbsp; Price: ₹{price:,.2f}</p>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px; vertical-align: middle;">₹{line_total:,.2f}</td>
        </tr>
        """
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Complete Your Purchase</title></head>
    <body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <div style="max-width: 580px; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                        
                        <!-- Header Logo -->
                        <div style="padding: 20px 28px; border-bottom: 2px solid #f1f5f9; text-align: left;">
                            <a href="{frontend_url}" style="text-decoration: none; display: inline-flex; align-items: center;">
                                <img src="{logo_url}" alt="TRONIX365" width="42" height="42" style="display: inline-block; border: 0; outline: none; vertical-align: middle; border-radius: 8px;" />
                                <span style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 1px; vertical-align: middle; margin-left: 8px;">TRONIX<span style="color: #6d28d9;">365</span></span>
                            </a>
                        </div>

                        <!-- Body -->
                        <div style="padding: 28px;">
                            <h2 style="color: #6d28d9; margin: 0 0 10px; font-weight: 800; font-size: 22px;">Complete Your Purchase</h2>
                            <p style="color: #475569; font-size: 14px; margin: 0 0 20px;">Hi <strong>{user_name}</strong>, you left some great items in your shopping cart! They are reserved for a limited time.</p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">{item_rows}</table>
                            
                            <div style="text-align: right; margin-bottom: 24px; padding-top: 10px;">
                                <p style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">Total: <span style="color: #6d28d9;">₹{total:,.2f}</span></p>
                            </div>

                            <div style="text-align: center; margin-bottom: 12px;">
                                <a href="{frontend_url}/cart" style="display: inline-block; background-color: #6d28d9; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(109,40,217,0.25);">Checkout Now</a>
                            </div>
                        </div>

                        <!-- Dark Footer -->
                        <div style="background-color: #111827; padding: 24px; text-align: center;">
                            <a href="{frontend_url}" style="text-decoration: none;">
                                <img src="{logo_url}" alt="TRONIX365" width="40" height="40" style="display: block; margin: 0 auto 6px auto; border: 0;" />
                                <span style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">TRONIX<span style="color: #a78bfa;">365</span></span>
                            </a>
                            <p style="margin: 8px 0 0; font-size: 11px; color: #6b7280;">© {datetime.now().year} Tronix365. All rights reserved.</p>
                        </div>

                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def send_abandoned_cart_email(to_email: str, user_name: str, cart_items: list, frontend_url: str):
    subject = "Items Left in Your Cart - Complete Your Order at Tronix365"
    html_content = generate_abandoned_cart_html(user_name, cart_items, frontend_url)
    return send_email_via_brevo(to_email, subject, html_content, sender_name="Tronix365 Support", status_trigger="abandoned_cart")


# =====================================================================
# TOWER ORDER (B2B FACTORY SOURCING) EMAIL NOTIFICATIONS
# =====================================================================

def generate_tower_order_email_base(
    title: str,
    subtitle: str,
    status_badge: str,
    order,
    details_html: str,
    action_button_text: Optional[str] = None,
    action_button_url: Optional[str] = None,
    frontend_url: str = "https://tronix365-e-commerse.onrender.com"
) -> str:
    logo_url = LOGO_PUBLIC_URL
    tracking_link = f"{frontend_url}/tower-orders?ref={order.order_number}"
    action_btn = ""
    if action_button_text and action_button_url:
        action_btn = f"""
        <div style="text-align: center; margin: 30px 0 10px 0;">
            <a href="{action_button_url}" style="background: #6d28d9; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(109,40,217,0.3);">
                {action_button_text} &rarr;
            </a>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; line-height: 1.6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
        <!-- Header -->
        <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); text-align: left; border-bottom: 2px solid #6d28d9;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="left">
                            <span style="font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px;">TRONIX<span style="color: #a78bfa;">365</span></span>
                            <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">B2B Tower Orders & Factory Sourcing</div>
                        </td>
                        <td align="right">
                            <span style="background: rgba(167, 139, 250, 0.2); border: 1px solid rgba(167, 139, 250, 0.4); color: #c4b5fd; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                                {status_badge}
                            </span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Main Body -->
        <tr>
            <td style="padding: 32px 32px 24px 32px;">
                <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">{title}</h1>
                <p style="font-size: 14px; color: #64748b; margin: 0 0 24px 0;">{subtitle}</p>

                <!-- Order Reference Banner -->
                <div style="background: #f1f5f9; border-left: 4px solid #6d28d9; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td>
                                <div style="font-size: 12px; color: #64748b; font-weight: 600;">ORDER REFERENCE</div>
                                <div style="font-size: 16px; font-weight: 800; color: #0f172a; font-family: monospace;">#{order.order_number}</div>
                            </td>
                            <td align="right">
                                <div style="font-size: 12px; color: #64748b; font-weight: 600;">PRODUCT</div>
                                <div style="font-size: 14px; font-weight: 700; color: #334155;">{order.product_name}</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Custom Content Block -->
                {details_html}

                <!-- Action Button -->
                {action_btn}

                <!-- Self Service Tracking Link -->
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 24px 0 0 0;">
                    Track live workflow status at: <a href="{tracking_link}" style="color: #6d28d9; font-weight: 600;">{tracking_link}</a>
                </p>
            </td>
        </tr>

        <!-- Help Notice -->
        <tr>
            <td style="padding: 18px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
                <strong>Questions or Special Specifications?</strong> Reply directly to this email or contact our enterprise sales desk at <a href="mailto:shubham.tronix365@gmail.com" style="color: #6d28d9; font-weight: 600;">shubham.tronix365@gmail.com</a>.
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background: #0f172a; padding: 24px 32px; text-align: center; color: #94a3b8; font-size: 12px;">
                <p style="margin: 0 0 6px 0; font-weight: 600; color: #cbd5e1;">Tronix365 Electronics — Direct Factory Sourcing & Supply Chain Partner</p>
                <p style="margin: 0; color: #64748b;">© {datetime.utcnow().year} Tronix365. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>"""


def send_tower_order_inquiry_email(order, frontend_url: str = "http://localhost:5173") -> bool:
    """Step 1 Notification: Dispatches when user places a tower order inquiry."""
    details = f"""
    <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
        <tr style="background: #f8fafc;">
            <td colspan="2" style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">Quantity & Target Budget Breakdown</td>
        </tr>
        <tr>
            <td style="color: #64748b; width: 45%;">Total Requested Quantity:</td>
            <td style="font-weight: 700; color: #0f172a;">{order.requested_qty:,} units</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Immediate Available Dispatch:</td>
            <td style="font-weight: 700; color: #16a34a;">{order.immediate_qty:,} units</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Factory Backorder Dispatch:</td>
            <td style="font-weight: 700; color: #d97706;">{order.backorder_qty:,} units</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Target Unit Price:</td>
            <td style="font-weight: 700; color: #0f172a;">₹{order.target_price:,.2f}</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Estimated Target Total:</td>
            <td style="font-weight: 700; color: #6d28d9; font-size: 16px;">₹{order.target_total:,.2f}</td>
        </tr>
        {f'<tr><td style="color: #64748b;">Required By Date:</td><td style="font-weight: 600;">{order.required_by_date}</td></tr>' if order.required_by_date else ''}
        {f'<tr><td style="color: #64748b;">Customer Remarks:</td><td style="color: #334155;">{order.customer_notes}</td></tr>' if order.customer_notes else ''}
    </table>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; margin-top: 15px;">
        <div style="font-weight: 700; color: #1e40af; font-size: 14px; margin-bottom: 4px;">Next Steps:</div>
        <p style="font-size: 13px; color: #1e3a8a; margin: 0;">
            1. Our dedicated sales engineer will review factory stock lines and contact you within 24 hours.<br>
            2. You will receive a formalized Proforma Invoice (P.I.) and confirmed pricing quotation.
        </p>
    </div>
    """
    html = generate_tower_order_email_base(
        title="Tower Order Inquiry Received",
        subtitle=f"Thank you {order.customer_name}. We have registered your bulk factory sourcing request.",
        status_badge="Inquiry Registered",
        order=order,
        details_html=details,
        action_button_text="View Tower Order Status",
        action_button_url=f"{frontend_url}/tower-orders?ref={order.order_number}",
        frontend_url=frontend_url
    )
    subject = f"Tower Order Inquiry Received - #{order.order_number} ({order.product_name}) - Tronix365"
    return send_email_via_brevo(
        to_email=order.customer_email,
        subject=subject,
        html_content=html,
        sender_name="Tronix365 Sales Desk",
        status_trigger="tower_order_inquiry"
    )


def send_tower_order_quotation_email(order, frontend_url: str = "http://localhost:5173") -> bool:
    """Step 3 Notification: Dispatches when sales team prepares and sends the P.I. / Quotation."""
    pi_num = order.pi_number or f"PI-{order.order_number}"
    details = f"""
    <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
        <tr style="background: #f8fafc;">
            <td colspan="2" style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">Quotation & Commercial Terms</td>
        </tr>
        <tr>
            <td style="color: #64748b; width: 45%;">Proforma Invoice (P.I.) No:</td>
            <td style="font-weight: 700; color: #0f172a; font-family: monospace;">{pi_num}</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Quoted Unit Price:</td>
            <td style="font-weight: 700; color: #0f172a;">₹{order.quoted_unit_price:,.2f}</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Final Quoted Total:</td>
            <td style="font-weight: 800; color: #16a34a; font-size: 16px;">₹{order.quoted_total_amount:,.2f}</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Production Lead Time:</td>
            <td style="font-weight: 600; color: #334155;">{order.factory_lead_days or 14} working days</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Shipping Transit Time:</td>
            <td style="font-weight: 600; color: #334155;">{order.shipping_lead_days or 5} business days</td>
        </tr>
        {f'<tr><td style="color: #64748b;">Quotation Notes:</td><td style="color: #334155;">{order.quotation_notes}</td></tr>' if order.quotation_notes else ''}
    </table>

    <div style="background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 8px; padding: 14px 18px; margin-top: 15px;">
        <div style="font-weight: 700; color: #86198f; font-size: 14px; margin-bottom: 4px;">To Confirm & Initiate Production:</div>
        <p style="font-size: 13px; color: #701a75; margin: 0;">
            Please review the Proforma Invoice and upload your advance payment receipt or UTR reference number on your Tower Order portal to lock factory production slots.
        </p>
    </div>
    """
    html = generate_tower_order_email_base(
        title="Proforma Invoice & Quotation Ready",
        subtitle=f"Great news {order.customer_name}! Your custom pricing and manufacturing lead time have been finalized.",
        status_badge="P.I. Ready",
        order=order,
        details_html=details,
        action_button_text="Review P.I. & Confirm Order",
        action_button_url=f"{frontend_url}/tower-orders?ref={order.order_number}",
        frontend_url=frontend_url
    )
    subject = f"P.I. & Quotation Ready - #{order.order_number} ({pi_num}) - Tronix365"
    return send_email_via_brevo(
        to_email=order.customer_email,
        subject=subject,
        html_content=html,
        sender_name="Tronix365 Sales Desk",
        status_trigger="tower_order_quotation"
    )


def send_tower_order_payment_verified_email(order, frontend_url: str = "http://localhost:5173") -> bool:
    """Step 5 Notification: Dispatches when payment proof is verified by admin."""
    details = f"""
    <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
        <tr style="background: #f8fafc;">
            <td colspan="2" style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">Payment Confirmation Details</td>
        </tr>
        <tr>
            <td style="color: #64748b; width: 45%;">Payment Mode:</td>
            <td style="font-weight: 700; color: #0f172a;">{order.payment_mode or 'Bank Transfer / RTGS / NEFT'}</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Payment Reference (UTR):</td>
            <td style="font-weight: 700; color: #0f172a; font-family: monospace;">{order.payment_ref_utr or 'Verified'}</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Amount Verified:</td>
            <td style="font-weight: 800; color: #16a34a; font-size: 16px;">₹{(order.payment_amount_received or order.quoted_total_amount or 0):,.2f}</td>
        </tr>
        {f'<tr><td style="color: #64748b;">Estimated Dispatch Date:</td><td style="font-weight: 700; color: #6d28d9;">{order.estimated_dispatch_date}</td></tr>' if order.estimated_dispatch_date else ''}
    </table>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-top: 15px;">
        <div style="font-weight: 700; color: #166534; font-size: 14px; margin-bottom: 4px;">Factory Production Sourcing Active:</div>
        <p style="font-size: 13px; color: #14532d; margin: 0;">
            Your payment has been successfully reconciled. The manufacturing assembly and quality validation cycle have been locked with our factory partner.
        </p>
    </div>
    """
    html = generate_tower_order_email_base(
        title="Payment Verified & Production Sourcing Initiated",
        subtitle=f"Payment for Tower Order #{order.order_number} has been verified successfully.",
        status_badge="In Production",
        order=order,
        details_html=details,
        action_button_text="View Production Timeline",
        action_button_url=f"{frontend_url}/tower-orders?ref={order.order_number}",
        frontend_url=frontend_url
    )
    subject = f"Payment Verified & Sourcing Initiated - #{order.order_number} - Tronix365"
    return send_email_via_brevo(
        to_email=order.customer_email,
        subject=subject,
        html_content=html,
        sender_name="Tronix365 Accounts",
        status_trigger="tower_order_payment_verified"
    )


def send_tower_order_dispatched_email(order, frontend_url: str = "http://localhost:5173") -> bool:
    """Step 6 Notification: Dispatches when consignment tracking & courier are updated."""
    details = f"""
    <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
        <tr style="background: #f8fafc;">
            <td colspan="2" style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">Consignment & Logistics Details</td>
        </tr>
        <tr>
            <td style="color: #64748b; width: 45%;">Logistics Partner:</td>
            <td style="font-weight: 700; color: #0f172a;">{order.courier_name or 'Surface Cargo / Express'}</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Waybill / AWB Number:</td>
            <td style="font-weight: 700; color: #0f172a; font-family: monospace;">{order.tracking_number}</td>
        </tr>
        {f'<tr><td style="color: #64748b;">Estimated Delivery Date:</td><td style="font-weight: 700; color: #16a34a;">{order.estimated_delivery_date}</td></tr>' if order.estimated_delivery_date else ''}
        <tr>
            <td style="color: #64748b;">Destination Address:</td>
            <td style="color: #334155;">{order.delivery_address}, {order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}</td>
        </tr>
    </table>
    """
    track_btn_url = order.tracking_url or f"{frontend_url}/tower-orders?ref={order.order_number}"
    html = generate_tower_order_email_base(
        title="Tower Order Consignment Dispatched",
        subtitle=f"Your tower shipment for #{order.order_number} has left our fulfillment facility.",
        status_badge="Dispatched",
        order=order,
        details_html=details,
        action_button_text="Track Courier Shipment",
        action_button_url=track_btn_url,
        frontend_url=frontend_url
    )
    subject = f"Tower Order Consignment Dispatched - #{order.order_number} ({order.courier_name}) - Tronix365"
    return send_email_via_brevo(
        to_email=order.customer_email,
        subject=subject,
        html_content=html,
        sender_name="Tronix365 Logistics",
        status_trigger="tower_order_dispatched"
    )

