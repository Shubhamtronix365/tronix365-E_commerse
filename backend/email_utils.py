import os
import requests
import logging
import base64
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
SENDER_EMAIL = os.getenv("CONTACT_EMAIL", "support@tronix365.com")


def get_logo_base64():
    """Reads the logo.png file and returns a base64 Data URI string."""
    try:
        logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "assets", "logo.png"))
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
                return f"data:image/png;base64,{encoded}"
    except Exception as e:
        logger.error(f"Error encoding logo: {e}")
    return ""


def send_email_via_brevo(
    to_email: str,
    subject: str,
    html_content: str,
    sender_name: str = "Tronix365",
    sender_email: str = None,
    reply_to: dict = None,
):
    """
    Sends an email using the Brevo API.
    """
    if not sender_email:
        sender_email = SENDER_EMAIL

    if not BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set. Skipping email.")
        return False

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
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
        logger.info(
            f"Email sent successfully to {to_email}. Message ID: {response.json().get('messageId')}"
        )
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send email via Brevo: {e}")
        if e.response:
            logger.error(f"Brevo Response: {e.response.text}")
        return False


def send_contact_form_notification(name: str, email: str, message: str):
    """
    Sends a notification to the admin/support email when a contact form is submitted.
    """
    # Send to the configured generic contact email
    to_email = os.getenv("CONTACT_EMAIL")
    if not to_email:
        logger.warning("CONTACT_EMAIL not set. Cannot send notification.")
        return False

    subject = f"New Contact Message from {name}"

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
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

    # We send FROM the system address (SENDER_EMAIL) TO the admin address (to_email)
    # We set 'reply-to' as the user's email so the admin can reply directly.
    return send_email_via_brevo(
        to_email,
        subject,
        html_body,
        sender_name="Tronix365 Contact Form",
        reply_to={"name": name, "email": email},
    )


def generate_order_confirmation_html(order, frontend_url: str):
    """
    Generates a premium, verified HTML invoice & order confirmation email.
    Includes the official Tronix365 logo, customer details, delivery address,
    itemized pricing breakdown, tax, and authenticity/refund policy notices.
    """
    date_str = (
        order.created_at.strftime("%B %d, %Y %I:%M %p")
        if hasattr(order.created_at, "strftime")
        else str(order.created_at).split(".")[0].replace("T", " ")
    )

    customer_name = order.full_name or (order.customer_email.split("@")[0] if order.customer_email else "Valued Customer")

    # Format delivery address
    address_parts = [
        order.address_line,
        order.city,
        order.state,
        f"Pincode: {order.pincode}" if order.pincode else None
    ]
    address_formatted = ", ".join([p for p in address_parts if p]) if any(address_parts) else "N/A"

    # Logo setup: Embedded base64 logo with fallback URL
    logo_base64 = get_logo_base64()
    if logo_base64:
        logo_img_tag = f'<img src="{logo_base64}" alt="Tronix365 Logo" style="max-height: 55px; width: auto; margin-bottom: 12px; display: inline-block;" />'
    else:
        logo_img_tag = f'<img src="{frontend_url}/assets/logo.png" alt="Tronix365 Logo" style="max-height: 55px; width: auto; margin-bottom: 12px; display: inline-block;" />'

    # Calculate item totals & discounts
    items_subtotal = sum((item.price_at_purchase or 0.0) * item.quantity for item in order.items)
    discount_amount = getattr(order, "discount_amount", 0.0) or 0.0
    coupon_code = getattr(order, "coupon_code", None)

    discount_row = ""
    if discount_amount > 0:
        coupon_label = f"Discount ({coupon_code})" if coupon_code else "Discount"
        discount_row = f"""
        <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #4ade80;">{coupon_label}</td>
            <td style="padding: 6px 0; font-size: 14px; color: #4ade80; text-align: right; font-weight: 600;">- ₹{discount_amount:,.2f}</td>
        </tr>
        """

    subtotal = max(order.total_amount, 0.0)
    # Estimate 18% GST component included in total
    gst = subtotal - (subtotal / 1.18) if subtotal > 0 else 0.0

    # Generate Item Rows
    item_rows = ""
    for item in order.items:
        img_url = (
            item.product.image
            if getattr(item.product, "image", None)
            else "https://placehold.co/80?text=TRONIX365"
        )
        if img_url.startswith("/"):
            img_url = f"{frontend_url}{img_url}"

        unit_price = item.price_at_purchase or 0.0
        line_total = unit_price * item.quantity

        item_rows += f"""
        <tr>
            <td style="padding: 14px 10px; border-bottom: 1px solid #1e293b; width: 70px;">
                <img src="{img_url}" alt="{item.product.title}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid #334155;" />
            </td>
            <td style="padding: 14px 10px; border-bottom: 1px solid #1e293b; text-align: left;">
                <p style="margin: 0; font-weight: 700; color: #f8fafc; font-size: 14px; line-height: 1.4;">{item.product.title}</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">Qty: <strong style="color: #a78bfa;">{item.quantity}</strong> &nbsp;|&nbsp; Unit Price: ₹{unit_price:,.2f}</p>
            </td>
            <td style="padding: 14px 10px; border-bottom: 1px solid #1e293b; text-align: right; width: 100px;">
                <p style="margin: 0; font-weight: 700; color: #4ade80; font-size: 15px;">₹{line_total:,.2f}</p>
            </td>
        </tr>
        """

    order_url = f"{frontend_url}/order/{order.id}"

    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - #order_tronix_{order.id:04d}</title>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 40px 15px; color: #e2e8f0;">
        
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #131b2e; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            
            <!-- Header with Official Logo & Authenticity Badge -->
            <tr>
                <td style="background: linear-gradient(135deg, #1e1b4b 0%, #311b92 50%, #4c1d95 100%); padding: 35px 30px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    {logo_img_tag}
                    <div>
                        <span style="display: inline-block; background: rgba(139, 92, 246, 0.25); border: 1px solid rgba(167, 139, 250, 0.4); color: #d8b4fe; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 6px;">
                            Verified Authentic Invoice & Order Confirmation
                        </span>
                    </div>
                </td>
            </tr>

            <!-- Welcome Greeting -->
            <tr>
                <td style="padding: 32px 30px 20px;">
                    <h2 style="margin: 0 0 12px; font-size: 22px; color: #ffffff; font-weight: 700;">Hello {customer_name},</h2>
                    <p style="margin: 0; font-size: 15px; color: #94a3b8; line-height: 1.6;">
                        Thank you for shopping with <strong style="color: #a78bfa;">Tronix365</strong>! Your order has been officially confirmed by our team and is now being prepared for shipping. Below are your complete order details.
                    </p>
                </td>
            </tr>

            <!-- Key Order Info Summary Box -->
            <tr>
                <td style="padding: 0 30px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; padding: 18px 20px;">
                        <tr>
                            <td style="padding: 6px 0; width: 50%;">
                                <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Order ID</span><br>
                                <span style="font-size: 16px; color: #a78bfa; font-weight: 700; font-family: monospace;">#order_tronix_{order.id:04d}</span>
                            </td>
                            <td style="padding: 6px 0; width: 50%; text-align: right;">
                                <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Order Date & Time</span><br>
                                <span style="font-size: 14px; color: #f1f5f9; font-weight: 600;">{date_str}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-top: 12px; border-top: 1px solid #1e293b;" colspan="2">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Order Status</span><br>
                                            <span style="display: inline-block; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-top: 4px; text-transform: uppercase;">{order.status}</span>
                                        </td>
                                        <td style="text-align: right;">
                                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Transaction ID</span><br>
                                            <span style="font-size: 13px; color: #cbd5e1; font-family: monospace;">{order.txnid or 'Paid / COD'}</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Shipping & Customer Info Box -->
            <tr>
                <td style="padding: 0 30px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; padding: 18px 20px;">
                        <tr>
                            <td style="padding-bottom: 10px; border-bottom: 1px solid #1e293b;" colspan="2">
                                <span style="font-size: 12px; color: #a78bfa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">🚚 Shipping & Contact Information</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 10px 4px 0; vertical-align: top; width: 50%;">
                                <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Customer Details</span><br>
                                <span style="font-size: 14px; color: #f1f5f9; font-weight: 600; display: block; margin-top: 2px;">{customer_name}</span>
                                <span style="font-size: 13px; color: #94a3b8; display: block; margin-top: 2px;">{order.customer_email}</span>
                                <span style="font-size: 13px; color: #94a3b8; display: block; margin-top: 2px;">Phone: {order.phone or 'N/A'}</span>
                            </td>
                            <td style="padding: 12px 0 4px 10px; vertical-align: top; width: 50%; text-align: right;">
                                <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Delivery Address</span><br>
                                <span style="font-size: 13px; color: #e2e8f0; line-height: 1.4; display: block; margin-top: 2px;">
                                    {address_formatted}
                                </span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Items Table Section Header -->
            <tr>
                <td style="padding: 0 30px 10px;">
                    <h3 style="margin: 0; font-size: 15px; color: #ffffff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
                        📦 Items Ordered ({len(order.items)})
                    </h3>
                </td>
            </tr>

            <!-- Items Rows -->
            <tr>
                <td style="padding: 0 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        {item_rows}
                    </table>
                </td>
            </tr>

            <!-- Financial Summary Breakdown -->
            <tr>
                <td style="padding: 20px 30px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; padding: 18px 20px;">
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #94a3b8;">Items Subtotal</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #f1f5f9; text-align: right; font-weight: 600;">₹{items_subtotal:,.2f}</td>
                        </tr>
                        {discount_row}
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #94a3b8;">Included GST (18%)</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #f59e0b; text-align: right; font-weight: 600;">₹{gst:,.2f}</td>
                        </tr>
                        <tr>
                            <td style="padding-top: 12px; border-top: 1px solid #1e293b; font-size: 15px; color: #ffffff; font-weight: 800;">Grand Total Paid</td>
                            <td style="padding-top: 12px; border-top: 1px solid #1e293b; font-size: 18px; color: #4ade80; text-align: right; font-weight: 900;">₹{order.total_amount:,.2f}</td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Policy & Authenticity Notice Box -->
            <tr>
                <td style="padding: 0 30px 24px;">
                    <div style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 16px 18px;">
                        <p style="margin: 0 0 6px; font-size: 13px; color: #a78bfa; font-weight: 700;">
                            🛡️ 100% Genuine Product & Quality Assurance
                        </p>
                        <p style="margin: 0 0 8px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                            All electronic hardware and components supplied by Tronix365 are strictly authentic and subjected to multi-point quality testing prior to shipment.
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                            <strong>Cancellation & Refund Policy:</strong> If your order is cancelled, refunds are processed back to your original payment mode within <strong>3-7 working days</strong>.
                        </p>
                    </div>
                </td>
            </tr>

            <!-- Call to Action Button -->
            <tr>
                <td style="padding: 0 30px 30px; text-align: center;">
                    <a href="{order_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; font-size: 15px; font-weight: 700; border-radius: 10px; box-shadow: 0 10px 20px rgba(109, 40, 217, 0.3);">
                        View Order Details & Download Invoice
                    </a>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td style="background-color: #0b0f19; padding: 24px 30px; text-align: center; border-top: 1px solid #1e293b;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
                        Need help? Contact our support team at <a href="mailto:support@tronix365.com" style="color: #a78bfa; text-decoration: none;">support@tronix365.com</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #475569;">
                        &copy; 2026 Tronix365 Technologies. All rights reserved.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html_template


def send_order_confirmation_email(order):
    """
    Orchestrates the HTML generation and email dispatch for a successful order.
    Designed to be called via FastAPI BackgroundTasks.
    """
    from database import SessionLocal
    from models import OrderDB, OrderItemDB
    from sqlalchemy.orm import joinedload

    order_id = order if isinstance(order, int) else order.id

    db = SessionLocal()
    try:
        # Reload order with eagerly loaded relationships to prevent DetachedInstanceError
        order_loaded = (
            db.query(OrderDB)
            .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
            .filter(OrderDB.id == order_id)
            .first()
        )
        if not order_loaded:
            logger.error(f"Order ID {order_id} not found in database. Cannot send confirmation.")
            return False

        to_email = order_loaded.customer_email
        if not to_email:
            logger.error(f"Order #{order_loaded.id} has no customer_email. Cannot send confirmation.")
            return False

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        if ("tronix365.in" in frontend_url or "tronix.in" in frontend_url) and "/e-commerse" not in frontend_url:
            frontend_url = f"{frontend_url}/e-commerse"

        subject = f"Order Confirmation - #order_tronix_{order_loaded.id:04d} from Tronix365"

        # Generate the pristine HTML payload
        html_content = generate_order_confirmation_html(order_loaded, frontend_url)

        # Dispatch using the Brevo hook
        return send_email_via_brevo(
            to_email, subject, html_content, sender_name="Tronix365 Orders"
        )
    except Exception as e:
        logger.error(f"Failed to send order confirmation email for order #{order_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False
    finally:
        db.close()


def generate_abandoned_cart_html(user_name, cart_items, frontend_url):
    """
    Generates a premium abandoned cart recovery email.
    """
    item_rows = ""
    total = 0
    for item in cart_items:
        img_url = (
            item.product.image
            if getattr(item.product, "image", None)
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
    """
    Sends a recovery email for abandoned carts.
    """
    to_email = user.email
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    subject = "Forget something? Your cart is waiting at Tronix365"
    html_content = generate_abandoned_cart_html(
        user.full_name or "there", cart_items, frontend_url
    )

    return send_email_via_brevo(
        to_email, subject, html_content, sender_name="Tronix365 Re-engagement"
    )


def generate_otp_email_html(otp: str) -> str:
    """
    Generates a premium glassmorphic/neon HTML template for OTP emails.
    """
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
    """
    Sends the OTP verification code to the user.
    """
    subject = f"{otp} is your Tronix365 Verification Code"
    html_content = generate_otp_email_html(otp)
    return send_email_via_brevo(email, subject, html_content, sender_name="Tronix365 Security")
