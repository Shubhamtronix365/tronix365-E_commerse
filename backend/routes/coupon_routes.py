from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import (
    CouponDB,
    CouponCreate,
    CouponResponse,
    CouponUpdate,
    UserDB,
)
from deps import get_current_admin
from logging_config import get_logger

logger = get_logger("coupon")
router = APIRouter(tags=["Coupons"])


@router.post("/admin/coupons", response_model=CouponResponse, status_code=201)
async def create_coupon(
    coupon: CouponCreate,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    existing = db.query(CouponDB).filter(CouponDB.code == coupon.code).first()
    if existing:
        logger.warning_event(
            module="COUPON",
            event="COUPON_CODE_ALREADY_EXISTS",
            message=f"Admin {current_admin.email} attempted to create existing coupon code '{coupon.code}'",
            action="Rejected coupon creation",
            result="DUPLICATE_CODE",
            code=coupon.code,
        )
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    new_coupon = CouponDB(**coupon.dict())
    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)

    logger.info_event(
        module="COUPON",
        event="COUPON_CREATED_BY_ADMIN",
        message=f"Admin {current_admin.email} created coupon '{new_coupon.code}' (Discount: {new_coupon.discount_value}{'%' if new_coupon.discount_type == 'percentage' else ' INR'})",
        action="Created CouponDB record",
        result="SUCCESS",
        coupon_id=new_coupon.id,
        code=new_coupon.code,
        discount_type=new_coupon.discount_type,
        discount_value=new_coupon.discount_value,
        admin_email=current_admin.email,
    )
    return new_coupon


@router.get("/admin/coupons", response_model=List[CouponResponse])
async def list_coupons(
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    return db.query(CouponDB).order_by(CouponDB.id.asc()).all()


@router.get("/admin/coupons/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    coupon = db.query(CouponDB).filter(CouponDB.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail=f"Coupon with ID {coupon_id} not found")
    return coupon


@router.put("/admin/coupons/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: int,
    update_data: CouponUpdate,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    coupon = db.query(CouponDB).filter(CouponDB.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(coupon, key, value)

    db.commit()
    db.refresh(coupon)

    logger.info_event(
        module="COUPON",
        event="COUPON_UPDATED_BY_ADMIN",
        message=f"Admin {current_admin.email} updated coupon #{coupon.id} ('{coupon.code}')",
        action="Updated CouponDB record",
        result="SUCCESS",
        coupon_id=coupon.id,
        code=coupon.code,
        admin_email=current_admin.email,
    )
    return coupon


@router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    coupon = db.query(CouponDB).filter(CouponDB.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    code = coupon.code
    db.delete(coupon)
    db.commit()

    logger.info_event(
        module="COUPON",
        event="COUPON_DELETED_BY_ADMIN",
        message=f"Admin {current_admin.email} deleted coupon #{coupon_id} ('{code}')",
        action="Deleted CouponDB record",
        result="SUCCESS",
        coupon_id=coupon_id,
        code=code,
        admin_email=current_admin.email,
    )
    return {"message": "Coupon deleted successfully"}


@router.post("/apply-coupon")
async def apply_coupon(code: str, cart_total: float, db: Session = Depends(get_db)):
    coupon = (
        db.query(CouponDB)
        .filter(CouponDB.code == code, CouponDB.is_active == True)
        .first()
    )
    if not coupon:
        logger.warning_event(
            module="COUPON",
            event="COUPON_NOT_FOUND_OR_INACTIVE",
            message=f"Coupon application rejected: code '{code}' is invalid or deactivated",
            action="Rejected discount",
            result="NOT_FOUND",
            code=code,
            cart_total=cart_total,
        )
        raise HTTPException(status_code=404, detail="Invalid or inactive coupon code")

    now = (
        datetime.now(coupon.expiry_date.tzinfo)
        if coupon.expiry_date.tzinfo
        else datetime.utcnow()
    )
    if now > coupon.expiry_date:
        logger.warning_event(
            module="COUPON",
            event="COUPON_EXPIRED",
            message=f"Coupon application rejected: '{coupon.code}' expired on {coupon.expiry_date}",
            action="Rejected discount",
            result="EXPIRED",
            code=coupon.code,
            expiry_date=str(coupon.expiry_date),
        )
        raise HTTPException(status_code=400, detail="Coupon has expired")

    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        logger.warning_event(
            module="COUPON",
            event="COUPON_USAGE_LIMIT_EXCEEDED",
            message=f"Coupon application rejected: '{coupon.code}' usage limit ({coupon.usage_limit}) reached",
            action="Rejected discount",
            result="LIMIT_EXCEEDED",
            code=coupon.code,
            used_count=coupon.used_count,
            usage_limit=coupon.usage_limit,
        )
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    if cart_total < coupon.min_purchase:
        logger.warning_event(
            module="COUPON",
            event="COUPON_MINIMUM_PURCHASE_NOT_MET",
            message=f"Coupon '{coupon.code}' requires min purchase INR {coupon.min_purchase} (Cart total: INR {cart_total})",
            action="Rejected discount",
            result="MIN_PURCHASE_NOT_MET",
            code=coupon.code,
            cart_total=cart_total,
            min_purchase=coupon.min_purchase,
        )
        raise HTTPException(
            status_code=400,
            detail=f"Minimum purchase of {coupon.min_purchase} required",
        )

    discount = 0.0
    if coupon.discount_type == "percentage":
        discount = cart_total * (coupon.discount_value / 100)
    else:
        discount = coupon.discount_value

    new_total = round(max(0, cart_total - discount), 2)
    logger.info_event(
        module="COUPON",
        event="COUPON_APPLIED_SUCCESSFULLY",
        message=f"Coupon '{coupon.code}' applied to cart (Original: INR {cart_total}, Discount: INR {round(discount, 2)}, Final: INR {new_total})",
        action="Calculated discount deductions",
        result="SUCCESS",
        code=coupon.code,
        discount_amount=round(discount, 2),
        cart_total=cart_total,
        new_total=new_total,
    )

    return {
        "code": coupon.code,
        "discount_amount": round(discount, 2),
        "new_total": new_total,
    }
