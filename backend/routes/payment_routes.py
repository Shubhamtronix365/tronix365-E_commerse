import os
import hashlib
from typing import List, Optional
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Form
from fastapi.responses import RedirectResponse, HTMLResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import (
    OrderDB,
    OrderItemDB,
    ProductDB,
    BundleDB,
    CartItemDB,
    UserDB,
)
from deps import get_current_user
from payu_utils import generate_payu_hash, verify_payu_hash

router = APIRouter(tags=["Payments"])


class PaymentItem(BaseModel):
    product_id: int
    quantity: int
    bundle_id: Optional[int] = None


class PaymentInitiate(BaseModel):
    amount: float
    firstname: str
    email: EmailStr
    productinfo: str
    items: List[PaymentItem]
    phone: str
    address_line: str
    city: str
    state: str
    pincode: str
    coupon_code: Optional[str] = None
    discount_amount: float = 0.0
    is_gst_invoice: Optional[bool] = False
    gstin: Optional[str] = None
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    gst_rate: Optional[float] = 18.0
    gst_amount: Optional[float] = None
    subtotal_before_gst: Optional[float] = None
    shipping_method: Optional[str] = 'surface'
    shipping_cost: Optional[float] = 0.0


@router.post("/payment/initiate")
async def initiate_payment(
    payment: PaymentInitiate,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    items_for_order = []
    for item in payment.items:
        product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404, detail=f"Product {item.product_id} not found"
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.title}. Only {product.stock} left.",
            )

        if item.bundle_id:
            bundle = db.query(BundleDB).filter(BundleDB.id == item.bundle_id).first()
            if bundle:
                if not bundle.is_active:
                    raise HTTPException(status_code=400, detail=f"Bundle '{bundle.name}' is inactive")
                if bundle.expiry_date:
                    from datetime import datetime
                    now = datetime.now(bundle.expiry_date.tzinfo) if bundle.expiry_date.tzinfo else datetime.utcnow()
                    if now > bundle.expiry_date:
                        raise HTTPException(status_code=400, detail=f"Bundle '{bundle.name}' has expired")
                if bundle.usage_limit and (bundle.used_count or 0) >= bundle.usage_limit:
                    raise HTTPException(status_code=400, detail=f"Bundle '{bundle.name}' has reached its usage limit")

        order_item = OrderItemDB(
            product_id=item.product_id,
            bundle_id=item.bundle_id,
            quantity=item.quantity,
            price_at_purchase=(
                product.price if product.price is not None else (product.sale_price or 0.0)
            ),
        )
        items_for_order.append(order_item)

    key = os.getenv("PAYU_KEY")
    salt = os.getenv("PAYU_SALT")
    txnid = f"TXN{int(payment.amount)}{os.urandom(4).hex()}"

    total_amount = max(0.0, payment.amount)
    shipping_cost = payment.shipping_cost if payment.shipping_cost is not None else 0.0
    items_total_with_gst = max(0.0, total_amount - shipping_cost)
    gst_rate = payment.gst_rate if payment.gst_rate is not None else 18.0
    subtotal_before_gst = round(items_total_with_gst / (1 + (gst_rate / 100)), 2)
    gst_amount = round(items_total_with_gst - subtotal_before_gst, 2)

    new_order = OrderDB(
        customer_email=current_user.email,
        total_amount=payment.amount,
        status="pending",
        items=items_for_order,
        txnid=txnid,
        full_name=payment.firstname,
        phone=payment.phone,
        address_line=payment.address_line,
        city=payment.city,
        state=payment.state,
        pincode=payment.pincode,
        coupon_code=payment.coupon_code,
        discount_amount=payment.discount_amount,
        is_gst_invoice=payment.is_gst_invoice or False,
        gstin=payment.gstin.strip().upper() if payment.gstin else None,
        company_name=payment.company_name.strip() if payment.company_name else None,
        company_address=payment.company_address.strip() if payment.company_address else None,
        gst_rate=gst_rate,
        gst_amount=payment.gst_amount if payment.gst_amount is not None else gst_amount,
        subtotal_before_gst=payment.subtotal_before_gst if payment.subtotal_before_gst is not None else subtotal_before_gst,
        shipping_method=payment.shipping_method or 'surface',
        shipping_cost=shipping_cost,
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    payu_env = os.getenv("PAYU_ENV", "MOCK").upper()
    if payu_env == "PROD":
        action_url = "https://secure.payu.in/_payment"
    elif payu_env == "TEST":
        action_url = "https://test.payu.in/_payment"
    else:
        action_url = (
            f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/mock-process"
        )

    amount_str = f"{payment.amount:.2f}"

    hash_value = generate_payu_hash(
        key,
        txnid,
        amount_str,
        payment.productinfo,
        payment.firstname,
        current_user.email,
        salt,
    )

    return {
        "key": key,
        "txnid": txnid,
        "amount": amount_str,
        "productinfo": payment.productinfo,
        "firstname": payment.firstname,
        "email": current_user.email,
        "phone": payment.phone,
        "surl": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/callback",
        "furl": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/callback",
        "hash": hash_value,
        "action": action_url,
    }


@router.post("/payment/retry/{order_id}")
async def retry_payment(
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
        raise HTTPException(status_code=403, detail="Not authorized to access this order")

    if order.status in ["confirmed", "shipped", "delivered"]:
        raise HTTPException(status_code=400, detail="Order is already paid/confirmed")

    for item in order.items:
        product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.title}. Only {product.stock} left."
            )

        if item.bundle_id:
            bundle = db.query(BundleDB).filter(BundleDB.id == item.bundle_id).first()
            if bundle:
                if not bundle.is_active:
                    raise HTTPException(status_code=400, detail=f"Bundle '{bundle.name}' is inactive")
                if bundle.expiry_date:
                    from datetime import datetime
                    now = datetime.now(bundle.expiry_date.tzinfo) if bundle.expiry_date.tzinfo else datetime.utcnow()
                    if now > bundle.expiry_date:
                        raise HTTPException(status_code=400, detail=f"Bundle '{bundle.name}' has expired")
                if bundle.usage_limit and (bundle.used_count or 0) >= bundle.usage_limit:
                    raise HTTPException(status_code=400, detail=f"Bundle '{bundle.name}' has reached its usage limit")

    txnid = f"TXN{int(order.total_amount)}{os.urandom(4).hex()}"
    order.txnid = txnid
    order.status = "pending"
    db.commit()
    db.refresh(order)

    key = os.getenv("PAYU_KEY")
    salt = os.getenv("PAYU_SALT")

    payu_env = os.getenv("PAYU_ENV", "MOCK").upper()
    if payu_env == "PROD":
        action_url = "https://secure.payu.in/_payment"
    elif payu_env == "TEST":
        action_url = "https://test.payu.in/_payment"
    else:
        action_url = (
            f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/mock-process"
        )

    amount_str = f"{order.total_amount:.2f}"
    productinfo = f"Order for {len(order.items)} items"

    hash_value = generate_payu_hash(
        key,
        txnid,
        amount_str,
        productinfo,
        order.full_name or "Customer",
        order.customer_email,
        salt,
    )

    return {
        "key": key,
        "txnid": txnid,
        "amount": amount_str,
        "productinfo": productinfo,
        "firstname": order.full_name or "Customer",
        "email": order.customer_email,
        "phone": order.phone or "",
        "surl": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/callback",
        "furl": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/callback",
        "hash": hash_value,
        "action": action_url,
    }


@router.post("/payment/mock-process")
async def mock_payment_process(
    key: str = Form(...),
    txnid: str = Form(...),
    amount: str = Form(...),
    productinfo: str = Form(...),
    firstname: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    surl: str = Form(...),
    furl: str = Form(...),
    hash: str = Form(...),
):
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    parsed_backend = urlparse(backend_url)
    parsed_frontend = urlparse(frontend_url)
    parsed_surl = urlparse(surl)
    parsed_furl = urlparse(furl)

    allowed_hosts = {
        parsed_backend.netloc,
        parsed_frontend.netloc,
        "localhost:8000",
        "127.0.0.1:8000",
        "localhost:5173",
        "127.0.0.1:5173",
        "tronix365-e-commerse.onrender.com",
    }
    
    if parsed_surl.netloc and parsed_surl.netloc not in allowed_hosts:
        raise HTTPException(status_code=400, detail="Invalid success redirect URL (Open Redirect prohibited)")
    if parsed_furl.netloc and parsed_furl.netloc not in allowed_hosts:
        raise HTTPException(status_code=400, detail="Invalid failure redirect URL (Open Redirect prohibited)")

    status = "success"
    if firstname.lower() == "failure":
        status = "failure"

    salt = os.getenv("PAYU_SALT")

    hash_string = f"{salt}|{status}|||||||||||{email}|{firstname}|{productinfo}|{amount}|{txnid}|{key}"
    response_hash = hashlib.sha512(hash_string.encode("utf-8")).hexdigest()

    html_content = f"""
    <html>
        <head><title>Processing Payment...</title></head>
        <body onload="document.forms[0].submit()">
            <form action="{surl}" method="post">
                <input type="hidden" name="status" value="{status}" />
                <input type="hidden" name="firstname" value="{firstname}" />
                <input type="hidden" name="amount" value="{amount}" />
                <input type="hidden" name="txnid" value="{txnid}" />
                <input type="hidden" name="hash" value="{response_hash}" />
                <input type="hidden" name="productinfo" value="{productinfo}" />
                <input type="hidden" name="email" value="{email}" />
                <input type="hidden" name="key" value="{key}" />
            </form>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)


@router.post("/payment/callback")
async def payment_callback(
    background_tasks: BackgroundTasks,
    status: str = Form(...),
    firstname: str = Form(...),
    amount: str = Form(...),
    txnid: str = Form(...),
    hash: str = Form(...),
    productinfo: str = Form(...),
    email: str = Form(...),
    error: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    key = os.getenv("PAYU_KEY")
    salt = os.getenv("PAYU_SALT")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    if not verify_payu_hash(
        salt, status, "", email, firstname, productinfo, amount, txnid, key, hash
    ):
        print(f"Hash verification failed for {txnid}")
        order = db.query(OrderDB).filter(OrderDB.txnid == txnid).first()
        if order:
            order.status = "tampered"
            db.commit()
        if ("tronix365.in" in frontend_url or "tronix.in" in frontend_url) and "/e-commerse" not in frontend_url:
            frontend_url = f"{frontend_url}/e-commerse"

        return RedirectResponse(
            url=f"{frontend_url}/payment/failure?txnid={txnid}&reason=tampered",
            status_code=303,
        )

    print(f"Payment Callback: {status} for {txnid}")

    order = db.query(OrderDB).filter(OrderDB.txnid == txnid).first()
    if order:
        if status == "success":
            if not order.status:
                order.status = "pending"
            db.commit()
            db.refresh(order)

            user_obj = db.query(UserDB).filter(UserDB.email == order.customer_email).first()
            if user_obj:
                db.query(CartItemDB).filter(CartItemDB.user_id == user_obj.id, CartItemDB.selected == True).delete()
                db.commit()
        else:
            order.status = "failed"
            db.commit()

    if ("tronix365.in" in frontend_url or "tronix.in" in frontend_url) and "/e-commerse" not in frontend_url:
        frontend_url = f"{frontend_url}/e-commerse"

    if status == "success":
        return RedirectResponse(
            url=f"{frontend_url}/payment/success?txnid={txnid}", status_code=303
        )
    else:
        return RedirectResponse(
            url=f"{frontend_url}/payment/failure?txnid={txnid}", status_code=303
        )
