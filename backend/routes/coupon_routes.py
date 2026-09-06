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

router = APIRouter(tags=["Coupons"])


@router.post("/admin/coupons", response_model=CouponResponse, status_code=201)
async def create_coupon(
    coupon: CouponCreate,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    existing = db.query(CouponDB).filter(CouponDB.code == coupon.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    new_coupon = CouponDB(**coupon.dict())
    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)
    return new_coupon


@router.get("/admin/coupons", response_model=List[CouponResponse])
async def list_coupons(
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    return db.query(CouponDB).all()


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
    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted successfully"}


@router.post("/apply-coupon")
async def apply_coupon(code: str, cart_total: float, db: Session = Depends(get_db)):
    coupon = (
        db.query(CouponDB)
        .filter(CouponDB.code == code, CouponDB.is_active == True)
        .first()
    )
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid or inactive coupon code")

    now = (
        datetime.now(coupon.expiry_date.tzinfo)
        if coupon.expiry_date.tzinfo
        else datetime.utcnow()
    )
    if now > coupon.expiry_date:
        raise HTTPException(status_code=400, detail="Coupon has expired")

    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    if cart_total < coupon.min_purchase:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum purchase of {coupon.min_purchase} required",
        )

    discount = 0.0
    if coupon.discount_type == "percentage":
        discount = cart_total * (coupon.discount_value / 100)
    else:
        discount = coupon.discount_value

    return {
        "code": coupon.code,
        "discount_amount": round(discount, 2),
        "new_total": round(max(0, cart_total - discount), 2),
    }
