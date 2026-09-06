from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import (
    BundleDB,
    BundleProductDB,
    BundleResponse,
    BundleCreate,
    BundleUpdate,
    CartItemDB,
    OrderItemDB,
    UserDB,
)
from deps import get_current_admin

router = APIRouter(tags=["Bundles"])


@router.post("/admin/bundles", response_model=BundleResponse, status_code=201)
async def create_bundle(
    bundle_data: BundleCreate,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    new_bundle = BundleDB(
        name=bundle_data.name,
        description=bundle_data.description,
        original_price=bundle_data.original_price,
        bundle_price=bundle_data.bundle_price,
        expiry_date=bundle_data.expiry_date,
        usage_limit=bundle_data.usage_limit,
        used_count=0
    )
    db.add(new_bundle)
    db.commit()
    db.refresh(new_bundle)

    for p_id in bundle_data.product_ids:
        bp = BundleProductDB(bundle_id=new_bundle.id, product_id=p_id)
        db.add(bp)

    db.commit()
    db.refresh(new_bundle)
    return (
        db.query(BundleDB)
        .options(joinedload(BundleDB.products).joinedload(BundleProductDB.product))
        .filter(BundleDB.id == new_bundle.id)
        .first()
    )


@router.put("/admin/bundles/{bundle_id}", response_model=BundleResponse)
async def update_bundle(
    bundle_id: int,
    update_data: BundleUpdate,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    bundle = db.query(BundleDB).filter(BundleDB.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(bundle, key, value)

    db.commit()
    db.refresh(bundle)
    return (
        db.query(BundleDB)
        .options(joinedload(BundleDB.products).joinedload(BundleProductDB.product))
        .filter(BundleDB.id == bundle_id)
        .first()
    )


@router.delete("/admin/bundles/{bundle_id}")
async def delete_bundle(
    bundle_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    bundle = db.query(BundleDB).filter(BundleDB.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    db.query(CartItemDB).filter(CartItemDB.bundle_id == bundle_id).update(
        {"bundle_id": None}
    )
    db.query(OrderItemDB).filter(OrderItemDB.bundle_id == bundle_id).update(
        {"bundle_id": None}
    )
    db.commit()

    db.delete(bundle)
    db.commit()
    return {"message": "Bundle deleted successfully"}


@router.get("/admin/bundles", response_model=List[BundleResponse])
async def get_admin_bundles(
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    return (
        db.query(BundleDB)
        .options(joinedload(BundleDB.products).joinedload(BundleProductDB.product))
        .all()
    )


@router.get("/bundles", response_model=List[BundleResponse])
async def get_bundles(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    active_bundles = (
        db.query(BundleDB)
        .filter(BundleDB.is_active == True)
        .options(joinedload(BundleDB.products).joinedload(BundleProductDB.product))
        .all()
    )

    filtered = []
    for b in active_bundles:
        if b.expiry_date:
            b_now = datetime.now(b.expiry_date.tzinfo) if b.expiry_date.tzinfo else now
            if b_now > b.expiry_date:
                continue
        if b.usage_limit and (b.used_count or 0) >= b.usage_limit:
            continue
        filtered.append(b)

    return filtered


@router.get("/products/{product_id}/bundles", response_model=List[BundleResponse])
async def get_product_bundles(product_id: int, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    bundles = (
        db.query(BundleDB)
        .join(BundleProductDB)
        .filter(BundleProductDB.product_id == product_id, BundleDB.is_active == True)
        .options(joinedload(BundleDB.products).joinedload(BundleProductDB.product))
        .all()
    )

    filtered = []
    for b in bundles:
        if b.expiry_date:
            b_now = datetime.now(b.expiry_date.tzinfo) if b.expiry_date.tzinfo else now
            if b_now > b.expiry_date:
                continue
        if b.usage_limit and (b.used_count or 0) >= b.usage_limit:
            continue
        filtered.append(b)

    return filtered
