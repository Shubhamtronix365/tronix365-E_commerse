from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi_cache.decorator import cache

from database import get_db
from models import (
    OrderDB,
    ProductDB,
    UserDB,
    ContactMessageDB,
    CartItemDB,
)
from deps import get_current_admin, limiter
from email_utils import send_contact_form_notification, send_abandoned_cart_email

router = APIRouter(tags=["Admin & General"])


class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    message: str


@router.post("/contact")
@limiter.limit("5/minute")
async def send_contact_email(
    request: Request,
    contact: ContactMessage,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    try:
        new_msg = ContactMessageDB(
            name=contact.name, email=contact.email, message=contact.message
        )
        db.add(new_msg)
        db.commit()
    except Exception as e:
        print(f"Error saving contact message to DB: {e}")

    background_tasks.add_task(
        send_contact_form_notification, contact.name, contact.email, contact.message
    )

    return {"message": "Message sent successfully, queued for delivery"}


@router.get("/admin/stats")
@cache(expire=3600)
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    total_orders = db.query(OrderDB).count()
    total_revenue = db.query(func.sum(OrderDB.total_amount)).scalar() or 0.0
    total_products = db.query(ProductDB).count()
    total_users = db.query(UserDB).count()

    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    current_revenue = (
        db.query(func.sum(OrderDB.total_amount))
        .filter(OrderDB.created_at >= thirty_days_ago)
        .scalar()
        or 0.0
    )
    previous_revenue = (
        db.query(func.sum(OrderDB.total_amount))
        .filter(
            OrderDB.created_at >= sixty_days_ago, OrderDB.created_at < thirty_days_ago
        )
        .scalar()
        or 0.0
    )

    if previous_revenue == 0:
        growth = 100.0 if current_revenue > 0 else 0.0
    else:
        growth = ((current_revenue - previous_revenue) / previous_revenue) * 100.0

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_products": total_products,
        "active_users": total_users,
        "growth": round(growth, 1),
    }


@router.get("/admin/abandoned-carts")
async def get_abandoned_carts(
    hours_threshold: int = 1,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    threshold_start = datetime.utcnow() - timedelta(hours=hours_threshold)
    threshold_end = datetime.utcnow() - timedelta(days=30)

    items = (
        db.query(CartItemDB)
        .options(joinedload(CartItemDB.user), joinedload(CartItemDB.product))
        .filter(
            CartItemDB.user_id.isnot(None),
            CartItemDB.updated_at <= threshold_start,
            CartItemDB.updated_at >= threshold_end,
        )
        .order_by(CartItemDB.updated_at.desc())
        .all()
    )

    user_map = {}
    for itm in items:
        if not itm.user:
            continue
        uid = itm.user_id
        if uid not in user_map:
            user_map[uid] = {
                "user_id": uid,
                "customer_name": itm.user.full_name or itm.user.email.split("@")[0],
                "customer_email": itm.user.email,
                "customer_phone": getattr(itm.user, "phone", None),
                "items": [],
                "cart_total": 0.0,
                "last_active": itm.updated_at,
                "reminder_sent": False,
                "reminder_sent_at": None,
                "raw_items": [],
            }

        prod_title = itm.product.title if itm.product else "Electronic Component"
        prod_price = float(itm.product.price or 0.0) if itm.product else 0.0
        prod_image = itm.product.image if itm.product else None
        item_subtotal = prod_price * itm.quantity

        user_map[uid]["items"].append({
            "cart_item_id": itm.id,
            "product_id": itm.product_id,
            "title": prod_title,
            "price": prod_price,
            "quantity": itm.quantity,
            "image": prod_image,
            "subtotal": round(item_subtotal, 2),
        })
        user_map[uid]["cart_total"] += item_subtotal
        user_map[uid]["raw_items"].append(itm)

        if itm.updated_at and itm.updated_at > user_map[uid]["last_active"]:
            user_map[uid]["last_active"] = itm.updated_at

        if itm.abandoned_email_sent_at:
            user_map[uid]["reminder_sent"] = True
            user_map[uid]["reminder_sent_at"] = itm.abandoned_email_sent_at

    # Filter out users who completed an order since their last cart activity
    abandoned_carts = []
    total_recoverable = 0.0
    reminders_sent_count = 0

    for uid, data in user_map.items():
        recent_order = (
            db.query(OrderDB)
            .filter(
                OrderDB.customer_email == data["customer_email"],
                OrderDB.created_at >= data["last_active"],
            )
            .first()
        )
        if not recent_order:
            data["cart_total"] = round(data["cart_total"], 2)
            total_recoverable += data["cart_total"]
            if data["reminder_sent"]:
                reminders_sent_count += 1
            # Remove raw_items from JSON payload
            data.pop("raw_items", None)
            abandoned_carts.append(data)

    # Sort most recent first
    abandoned_carts.sort(key=lambda c: c["last_active"] or datetime.min, reverse=True)

    return {
        "summary": {
            "total_abandoned_carts": len(abandoned_carts),
            "total_recoverable_revenue": round(total_recoverable, 2),
            "reminders_sent_count": reminders_sent_count,
            "pending_reminders_count": len(abandoned_carts) - reminders_sent_count,
        },
        "carts": abandoned_carts,
    }


@router.post("/admin/abandoned-carts/{target_user_id}/send")
async def send_single_abandoned_cart_reminder(
    target_user_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    items = (
        db.query(CartItemDB)
        .options(joinedload(CartItemDB.user), joinedload(CartItemDB.product))
        .filter(CartItemDB.user_id == target_user_id)
        .all()
    )
    if not items or not items[0].user:
        raise HTTPException(status_code=404, detail="No active cart items found for this user")

    user = items[0].user
    success = send_abandoned_cart_email(user, items, coupon_code="RECOVER5")
    if success:
        now = datetime.utcnow()
        for itm in items:
            itm.abandoned_email_sent_at = now
        db.commit()
        return {"message": f"Recovery reminder sent successfully to {user.email}", "success": True}
    else:
        raise HTTPException(status_code=500, detail="Failed to dispatch recovery email via Brevo")


@router.post("/admin/abandoned-carts/send-all")
async def send_all_abandoned_cart_reminders(
    hours_threshold: int = 1,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    from scripts.abandoned_cart_check import check_abandoned_carts
    result = check_abandoned_carts(force_resend=False, hours_threshold=hours_threshold)
    return {
        "message": f"Bulk reminder check completed. Sent {result['emails_sent']} recovery emails.",
        "details": result,
    }
