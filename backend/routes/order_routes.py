import logging
import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from database import get_db
from models import (
    Order,
    OrderCreate,
    OrderDB,
    OrderItemDB,
    OrderStatusUpdate,
    ProductDB,
    CouponDB,
    BundleDB,
    EmailLogDB,
    EmailLogResponse,
    UserDB,
)
from deps import get_current_user, get_current_admin
from email_utils import send_order_status_email

logger = logging.getLogger("order_routes")
router = APIRouter(tags=["Orders"])


@router.post("/orders", status_code=201)
async def create_order(
    order: OrderCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    total_amount = max(0.0, order.total_amount)
    shipping_cost = order.shipping_cost if order.shipping_cost is not None else 0.0
    items_total_with_gst = max(0.0, total_amount - shipping_cost)
    gst_rate = order.gst_rate if order.gst_rate is not None else 18.0
    subtotal_before_gst = round(items_total_with_gst / (1 + (gst_rate / 100)), 2)
    gst_amount = round(items_total_with_gst - subtotal_before_gst, 2)

    new_order = OrderDB(
        customer_email=order.customer_email,
        total_amount=total_amount,
        status="pending",
        full_name=order.full_name,
        phone=order.phone,
        address_line=order.address_line,
        city=order.city,
        state=order.state,
        pincode=order.pincode,
        is_gst_invoice=order.is_gst_invoice or False,
        gstin=order.gstin.strip().upper() if order.gstin else None,
        company_name=order.company_name.strip() if order.company_name else None,
        company_address=order.company_address.strip() if order.company_address else None,
        gst_rate=gst_rate,
        gst_amount=order.gst_amount if order.gst_amount is not None else gst_amount,
        subtotal_before_gst=order.subtotal_before_gst if order.subtotal_before_gst is not None else subtotal_before_gst,
        shipping_method=order.shipping_method or 'surface',
        shipping_cost=order.shipping_cost if order.shipping_cost is not None else 0.0,
    )

    for item in order.items:
        product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=400, detail=f"Product ID {item.product_id} is invalid."
            )

        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.title}. Only {product.stock} available.",
            )

        price = (
            product.price
            if product.price is not None
            else (product.sale_price if product.sale_price else 0.0)
        )

        order_item = OrderItemDB(
            product_id=item.product_id, quantity=item.quantity, price_at_purchase=price
        )
        new_order.items.append(order_item)

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    background_tasks.add_task(send_order_status_email, new_order.id, "pending")

    return {
        "message": "Order placed successfully. Pending admin approval.",
        "order_id": new_order.id,
        "status": "pending",
        "gst_amount": new_order.gst_amount,
        "shipping_method": new_order.shipping_method,
        "shipping_cost": new_order.shipping_cost,
    }


@router.put("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: int, 
    background_tasks: BackgroundTasks,
    status_update: Optional[OrderStatusUpdate] = Body(default=None), 
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin)
):
    if status_update is None:
        status_update = OrderStatusUpdate()

    order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    previous_status = order.status or "pending"
    new_status = (status_update.status.lower().strip() if status_update.status else previous_status.lower())

    if status_update.custom_courier and status_update.custom_courier.strip():
        order.courier = status_update.custom_courier.strip()
    elif status_update.courier and status_update.courier.strip():
        order.courier = status_update.courier.strip()

    if status_update.tracking_number is not None:
        order.tracking_number = status_update.tracking_number.strip()
    if status_update.estimated_delivery_date is not None:
        order.estimated_delivery_date = status_update.estimated_delivery_date.strip()
    if status_update.estimated_arrival_time is not None:
        order.estimated_arrival_time = status_update.estimated_arrival_time.strip()

    if status_update.cancellation_reason is not None and status_update.cancellation_reason.strip():
        order.cancellation_reason = status_update.cancellation_reason.strip()
    elif new_status in ["cancelled", "deleted"] and not order.cancellation_reason:
        order.cancellation_reason = "Cancelled by Store Administrator"

    if status_update.refund_status is not None and status_update.refund_status.strip():
        order.refund_status = status_update.refund_status.strip()
    elif new_status in ["cancelled", "deleted"] and not order.refund_status:
        order.refund_status = "Full Refund Initiated (3-7 Working Days)"

    if new_status in ["cancelled", "deleted"]:
        if not order.cancellation_date:
            order.cancellation_date = datetime.utcnow()

    if status_update.return_reason is not None:
        order.return_reason = status_update.return_reason.strip()
    if status_update.rejection_reason is not None:
        order.rejection_reason = status_update.rejection_reason.strip()

    try:
        if new_status in ["deleted", "cancelled"] and previous_status.lower() in ["confirmed", "shipped", "delivered", "out_for_delivery"]:
            for item in (order.items or []):
                if item.product_id:
                    product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
                    if product:
                        product.stock = (product.stock or 0) + item.quantity

        if new_status == "confirmed" and previous_status.lower() == "pending":
            for item in (order.items or []):
                if item.product_id:
                    product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
                    if product:
                        product.stock = max(0, (product.stock or 0) - item.quantity)
            if order.coupon_code:
                coupon = db.query(CouponDB).filter(CouponDB.code == order.coupon_code).first()
                if coupon:
                    coupon.used_count = (coupon.used_count or 0) + 1

            bundle_ids = {item.bundle_id for item in (order.items or []) if item.bundle_id}
            for b_id in bundle_ids:
                bundle = db.query(BundleDB).filter(BundleDB.id == b_id).first()
                if bundle:
                    bundle.used_count = (bundle.used_count or 0) + 1

        order.status = new_status
        db.commit()
        db.refresh(order)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to commit order #{order_id} status update: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update order status: {str(e)}")

    try:
        background_tasks.add_task(send_order_status_email, order.id, new_status, True)
    except Exception as e:
        logger.error(f"Error queueing background email task for order #{order.id}: {e}")

    return {
        "message": f"Order status updated to '{new_status}' successfully",
        "status": order.status,
        "courier": order.courier,
        "tracking_number": order.tracking_number,
    }


@router.post("/admin/orders/{order_id}/send-email")
async def admin_send_order_email(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    background_tasks.add_task(send_order_status_email, order.id, order.status, True)
    return {"message": f"Email dispatch queued for order #{order_id}"}


@router.get("/admin/email-logs", response_model=List[EmailLogResponse])
async def get_email_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    return db.query(EmailLogDB).order_by(EmailLogDB.id.desc()).offset(skip).limit(limit).all()


@router.get("/orders", response_model=List[Order])
async def get_orders(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    query = db.query(OrderDB).options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
    if search:
        search_term = f"%{search}%"
        filters = [
            OrderDB.customer_email.ilike(search_term),
            OrderDB.status.ilike(search_term),
            OrderDB.full_name.ilike(search_term),
            OrderDB.txnid.ilike(search_term),
            OrderDB.phone.ilike(search_term),
            OrderDB.city.ilike(search_term),
            OrderDB.state.ilike(search_term),
            OrderDB.pincode.ilike(search_term),
        ]
        
        product_filter = OrderDB.items.any(
            OrderItemDB.product.has(
                or_(
                    ProductDB.title.ilike(search_term),
                    ProductDB.skv.ilike(search_term),
                )
            )
        )
        filters.append(product_filter)
        
        try:
            clean_search = search.strip()
            match = re.search(r'(?:order_tronix_|#)+(\d+)', clean_search, re.IGNORECASE)
            if match:
                order_id = int(match.group(1))
                filters.append(OrderDB.id == order_id)
            else:
                order_id = int(clean_search)
                filters.append(OrderDB.id == order_id)
        except ValueError:
            pass
            
        query = query.filter(or_(*filters))

    orders = query.order_by(OrderDB.id.desc()).offset(skip).limit(limit).all()
    return orders


@router.get("/debug-orders")
async def debug_orders(
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    orders = db.query(OrderDB).order_by(OrderDB.id.desc()).limit(3).all()
    users = db.query(UserDB).order_by(UserDB.id.desc()).limit(3).all()
    return {
        "recent_orders": [
            {"id": o.id, "email": o.customer_email, "status": o.status} for o in orders
        ],
        "recent_users": [{"id": u.id, "email": u.email} for u in users],
    }


@router.get("/orders/user", response_model=List[Order])
async def get_user_orders(
    skip: int = 0,
    limit: int = 20,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
        .filter(OrderDB.customer_email == current_user.email)
        .order_by(OrderDB.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return orders


@router.get("/orders/{order_id}", response_model=Order)
async def get_order_by_id(
    order_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
        .filter(OrderDB.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.customer_email != current_user.email and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this order")

    return order


@router.get("/orders/transaction/{txnid}", response_model=Order)
async def get_order_by_txnid(
    txnid: str,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
        .filter(OrderDB.txnid == txnid)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.customer_email != current_user.email and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this order")

    return order
