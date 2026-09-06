import os
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import (
    TowerOrderDB,
    TowerOrderCreate,
    TowerOrderStatusUpdate,
    TowerOrderQuotationUpdate,
    TowerOrderPaymentSubmit,
    TowerOrderPaymentVerify,
    TowerOrderShipmentUpdate,
    TowerOrderResponse,
    ProductDB,
    Product,
    UserDB,
)
from deps import get_current_user, get_current_admin
from email_utils import (
    send_tower_order_inquiry_email,
    send_tower_order_quotation_email,
    send_tower_order_payment_verified_email,
    send_tower_order_dispatched_email,
)

logger = logging.getLogger("tower_order_routes")
router = APIRouter(tags=["Tower Orders"])


@router.post("/tower-orders", response_model=TowerOrderResponse, status_code=201)
async def create_tower_order(
    request: Request,
    order_data: TowerOrderCreate,
    db: Session = Depends(get_db),
):
    """
    Step 1: Customer places a tower order (B2B bulk sourcing).
    """
    user_id = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from jose import jwt
            from auth import SECRET_KEY, ALGORITHM
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_email = payload.get("sub")
            if user_email:
                user_obj = db.query(UserDB).filter(UserDB.email == user_email).first()
                if user_obj:
                    user_id = user_obj.id
        except Exception:
            pass

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in or register to place a B2B Tower Order."
        )

    random_suffix = os.urandom(2).hex().upper()
    date_part = datetime.utcnow().strftime("%y%m%d")
    order_number = f"TO-{date_part}-{random_suffix}"

    product_sku = order_data.product_sku
    product_image = order_data.product_image
    factory_lead = 7
    shipping_lead = 3

    if order_data.product_id:
        product = db.query(ProductDB).filter(ProductDB.id == order_data.product_id).first()
        if product:
            if not product_sku:
                product_sku = product.skv
            if not product_image:
                product_image = product.image
            if product.factory_lead_days:
                factory_lead = product.factory_lead_days
            if product.shipping_lead_days:
                shipping_lead = product.shipping_lead_days

    req_qty = max(1, order_data.requested_qty)
    imm_qty = max(0, order_data.immediate_qty or 0)
    back_qty = order_data.backorder_qty
    if back_qty is None:
        back_qty = max(0, req_qty - imm_qty)

    target_total = order_data.target_total
    if not target_total:
        target_total = round(order_data.target_price * req_qty, 2)

    new_order = TowerOrderDB(
        order_number=order_number,
        user_id=user_id,
        product_id=order_data.product_id,
        product_name=order_data.product_name,
        product_sku=product_sku,
        product_image=product_image,
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        company_name=order_data.company_name,
        gstin=order_data.gstin,
        delivery_address=order_data.delivery_address,
        delivery_city=order_data.delivery_city,
        delivery_state=order_data.delivery_state,
        delivery_pincode=order_data.delivery_pincode,
        requested_qty=req_qty,
        immediate_qty=imm_qty,
        backorder_qty=back_qty,
        target_price=order_data.target_price,
        target_total=target_total,
        customer_notes=order_data.customer_notes,
        required_by_date=order_data.required_by_date,
        factory_lead_days=factory_lead,
        shipping_lead_days=shipping_lead,
        status="requested",
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        send_tower_order_inquiry_email(new_order, frontend_url)
    except Exception as e:
        logger.error(f"Failed to dispatch tower order inquiry email: {e}")

    return new_order


@router.get("/tower-orders/user", response_model=List[TowerOrderResponse])
async def get_user_tower_orders(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = (
        db.query(TowerOrderDB)
        .filter(
            or_(
                TowerOrderDB.user_id == current_user.id,
                TowerOrderDB.customer_email == current_user.email,
            )
        )
        .order_by(TowerOrderDB.created_at.desc())
        .all()
    )
    return orders


@router.get("/tower-orders/{order_ref}", response_model=TowerOrderResponse)
async def get_tower_order_by_ref(
    order_ref: str,
    db: Session = Depends(get_db),
):
    order = None
    if order_ref.isdigit():
        order = db.query(TowerOrderDB).filter(TowerOrderDB.id == int(order_ref)).first()
    if not order:
        order = db.query(TowerOrderDB).filter(TowerOrderDB.order_number == order_ref).first()

    if not order:
        raise HTTPException(status_code=404, detail="Tower order not found")
    return order


@router.post("/tower-orders/{order_id}/payment-proof", response_model=TowerOrderResponse)
async def submit_tower_order_payment(
    order_id: int,
    payment_data: TowerOrderPaymentSubmit,
    db: Session = Depends(get_db),
):
    order = db.query(TowerOrderDB).filter(TowerOrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Tower order not found")

    order.payment_mode = payment_data.payment_mode
    order.payment_ref_utr = payment_data.payment_ref_utr
    order.payment_receipt_url = payment_data.payment_receipt_url
    order.payment_status = "submitted"
    order.status = "payment_pending"

    db.commit()
    db.refresh(order)
    return order


@router.get("/admin/tower-orders", response_model=List[TowerOrderResponse])
async def get_admin_tower_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(TowerOrderDB)

    if status and status != "all":
        query = query.filter(TowerOrderDB.status == status)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                TowerOrderDB.order_number.ilike(s),
                TowerOrderDB.customer_name.ilike(s),
                TowerOrderDB.customer_email.ilike(s),
                TowerOrderDB.customer_phone.ilike(s),
                TowerOrderDB.product_name.ilike(s),
                TowerOrderDB.company_name.ilike(s),
            )
        )

    return query.order_by(TowerOrderDB.created_at.desc()).all()


@router.put("/admin/tower-orders/{order_id}/status", response_model=TowerOrderResponse)
async def update_tower_order_status(
    order_id: int,
    status_update: TowerOrderStatusUpdate,
    current_admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = db.query(TowerOrderDB).filter(TowerOrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Tower order not found")

    if status_update.status == "contacted" and not order.contacted_at:
        order.contacted_at = datetime.utcnow()

    if status_update.sales_rep_notes is not None:
        order.sales_rep_notes = status_update.sales_rep_notes

    order.status = status_update.status
    db.commit()
    db.refresh(order)
    return order


@router.put("/admin/tower-orders/{order_id}/quotation", response_model=TowerOrderResponse)
async def update_tower_order_quotation(
    order_id: int,
    quotation: TowerOrderQuotationUpdate,
    current_admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = db.query(TowerOrderDB).filter(TowerOrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Tower order not found")

    order.pi_number = quotation.pi_number or f"PI-{order.order_number}"
    order.quoted_unit_price = quotation.quoted_unit_price
    order.quoted_total_amount = quotation.quoted_total_amount
    order.quotation_notes = quotation.quotation_notes
    order.pi_file_url = quotation.pi_file_url
    if quotation.factory_lead_days is not None:
        order.factory_lead_days = quotation.factory_lead_days
    if quotation.shipping_lead_days is not None:
        order.shipping_lead_days = quotation.shipping_lead_days

    order.quotation_sent_at = datetime.utcnow()
    order.status = "quotation_sent"

    db.commit()
    db.refresh(order)

    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        send_tower_order_quotation_email(order, frontend_url)
    except Exception as e:
        logger.error(f"Failed to dispatch tower order quotation email: {e}")

    return order


@router.put("/admin/tower-orders/{order_id}/verify-payment", response_model=TowerOrderResponse)
async def verify_tower_order_payment(
    order_id: int,
    verify_data: TowerOrderPaymentVerify,
    current_admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = db.query(TowerOrderDB).filter(TowerOrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Tower order not found")

    order.payment_amount_received = verify_data.payment_amount_received
    order.payment_status = verify_data.payment_status
    order.payment_received_at = datetime.utcnow()
    order.status = "in_production"

    est_dispatch = datetime.utcnow() + timedelta(days=order.factory_lead_days or 7)
    order.estimated_dispatch_date = est_dispatch.strftime("%Y-%m-%d")

    est_delivery = est_dispatch + timedelta(days=order.shipping_lead_days or 3)
    order.estimated_delivery_date = est_delivery.strftime("%Y-%m-%d")

    db.commit()
    db.refresh(order)

    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        send_tower_order_payment_verified_email(order, frontend_url)
    except Exception as e:
        logger.error(f"Failed to dispatch tower order payment verified email: {e}")

    return order


@router.put("/admin/tower-orders/{order_id}/shipment", response_model=TowerOrderResponse)
async def update_tower_order_shipment(
    order_id: int,
    shipment: TowerOrderShipmentUpdate,
    current_admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = db.query(TowerOrderDB).filter(TowerOrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Tower order not found")

    order.courier_name = shipment.courier_name
    order.tracking_number = shipment.tracking_number
    order.tracking_url = shipment.tracking_url
    if shipment.estimated_delivery_date:
        order.estimated_delivery_date = shipment.estimated_delivery_date

    order.shipped_at = datetime.utcnow()
    order.status = "shipped"

    db.commit()
    db.refresh(order)

    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        send_tower_order_dispatched_email(order, frontend_url)
    except Exception as e:
        logger.error(f"Failed to dispatch tower order dispatched email: {e}")

    return order


@router.get("/tower-products", response_model=List[Product])
async def get_tower_sourcing_products(
    db: Session = Depends(get_db),
):
    return (
        db.query(ProductDB)
        .filter(or_(ProductDB.tower_order_only == True, ProductDB.is_tower_order_eligible == True))
        .limit(100)
        .all()
    )
