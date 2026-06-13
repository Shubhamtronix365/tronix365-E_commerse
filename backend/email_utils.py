import os
import requests
import logging
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
SENDER_EMAIL = os.getenv("CONTACT_EMAIL", "support@tronix365.com")


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
    Generates a premium Amazon-style HTML invoice for the order confirmation email.
    Assumes `order` is a SQLAlchemy OrderDB instance with a joined `.items` relationship
    where each item has a `.product` relationship.
    """
    date_str = (
        order.created_at.strftime("%B %d, %Y")
        if hasattr(order.created_at, "strftime")
        else str(order.created_at).split("T")[0]
    )

    # Calculate totals
    subtotal = sum(item.price_at_purchase * item.quantity for item in order.items)
    gst = subtotal * 0.18
    grand_total = subtotal + gst

    # Generate item rows
    item_rows = ""
    for item in order.items:
        # Fallback to a placeholder if image is missing
        img_url = (
            item.product.image
            if getattr(item.product, "image", None)
            else "https://placehold.co/80?text=TRONIX365"
        )
        # Ensure image is absolute URL if it's relative
        if img_url.startswith("/"):
            img_url = f"{frontend_url}{img_url}"

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
                <p style="margin: 0; font-weight: bold; color: #333;">₹{(item.price_at_purchase * item.quantity):,.2f}</p>
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
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px; color: #333;">
        
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <!-- Header -->
            <tr>
                <td style="background-color: #8b5cf6; padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">TRONIX365</h1>
                    <p style="color: #eaddff; margin: 10px 0 0; font-size: 16px;">Order Confirmation</p>
                </td>
            </tr>
            
            <!-- Welcome Message -->
            <tr>
                <td style="padding: 40px 30px 20px;">
                    <h2 style="margin: 0 0 15px; font-size: 22px; color: #111827;">Hello {order.full_name},</h2>
                    <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.5;">
                        Thank you for shopping with Tronix365! We've received your order and are currently processing it. 
                        Below are the details of your purchase.
                    </p>
                </td>
            </tr>
            
            <!-- Order Details Box -->
            <tr>
                <td style="padding: 0 30px 20px;">
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="padding-bottom: 10px;">
                                    <span style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold;">Order ID</span><br>
                                    <span style="font-size: 16px; color: #0f172a; font-weight: bold;">#order_tronix_{order.id:04d}</span>
                                </td>
                                <td style="padding-bottom: 10px; text-align: right;">
                                    <span style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold;">Order Date</span><br>
                                    <span style="font-size: 16px; color: #0f172a; font-weight: bold;">{date_str}</span>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding-top: 10px; border-top: 1px solid #e2e8f0;">
                                    <span style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold;">Status</span><br>
                                    <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: bold; margin-top: 4px; text-transform: capitalize;">{order.status}</span>
                                </td>
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>
            
            <!-- Items Table -->
            <tr>
                <td style="padding: 0 30px;">
                    <h3 style="margin: 0 0 15px; font-size: 18px; color: #111827; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Items Ordered</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        {item_rows}
                    </table>
                </td>
            </tr>
            
            <!-- Financial Summary -->
            <tr>
                <td style="padding: 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="50%"></td>
                            <td width="50%">
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px; color: #4b5563;">
                                    <tr>
                                        <td style="padding-bottom: 10px;">Subtotal</td>
                                        <td style="padding-bottom: 10px; text-align: right; color: #111827;">₹{subtotal:,.2f}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding-bottom: 10px;">Estimated GST (18%)</td>
                                        <td style="padding-bottom: 10px; text-align: right; color: #111827;">₹{gst:,.2f}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding-top: 15px; padding-bottom: 5px; border-top: 2px solid #e2e8f0; font-weight: bold; font-size: 18px; color: #111827;">Grand Total</td>
                                        <td style="padding-top: 15px; padding-bottom: 5px; border-top: 2px solid #e2e8f0; font-weight: bold; font-size: 18px; text-align: right; color: #8b5cf6;">₹{grand_total:,.2f}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- Call to Action -->
            <tr>
                <td style="padding: 10px 30px 40px; text-align: center;">
                    <a href="{order_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 16px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.25);">Manage Your Order</a>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #64748b;">
                        Need help? Reply to this email or contact our support team.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                        &copy; 2026 Tronix365. All rights reserved.<br>
                        123 Innovation Park, Silicon Valley, India
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
