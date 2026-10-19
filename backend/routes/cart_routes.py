from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import (
    CartItemDB,
    CartItemCreate,
    CartItemUpdate,
    CartItemResponse,
    CartMergeRequest,
    BundleDB,
    UserDB,
)
from deps import get_current_user

router = APIRouter(tags=["Cart"])


@router.get("/cart", response_model=List[CartItemResponse])
async def get_cart(
    response: Response,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(CartItemDB)
        .options(joinedload(CartItemDB.product), joinedload(CartItemDB.bundle))
        .filter(CartItemDB.user_id == current_user.id)
        .all()
    )

    warnings = []
    has_changes = False

    for item in items:
        if item.bundle_id:
            bundle = item.bundle
            is_invalid = False
            reason = ""

            if not bundle:
                is_invalid = True
                reason = "is no longer available"
            elif not bundle.is_active:
                is_invalid = True
                reason = "is inactive"
            elif bundle.expiry_date:
                now = (
                    datetime.now(bundle.expiry_date.tzinfo)
                    if bundle.expiry_date.tzinfo
                    else datetime.utcnow()
                )
                if now > bundle.expiry_date:
                    is_invalid = True
                    reason = "has expired"
            elif bundle.usage_limit and (bundle.used_count or 0) >= bundle.usage_limit:
                is_invalid = True
                reason = "has reached its usage limit"

            if is_invalid:
                bundle_name = bundle.name if bundle else "Promo Bundle"
                item.bundle_id = None
                item.bundle = None
                has_changes = True
                warning_msg = f"Bundle '{bundle_name}' {reason}. Items remain in your cart at regular price."
                item.bundle_warning = warning_msg
                if warning_msg not in warnings:
                    warnings.append(warning_msg)

    if has_changes:
        db.commit()

    if warnings:
        import urllib.parse
        response.headers["X-Cart-Warnings"] = urllib.parse.quote("; ".join(warnings))
        response.headers["Access-Control-Expose-Headers"] = "X-Cart-Warnings"

    return items


@router.post("/cart", response_model=CartItemResponse)
async def add_to_cart(
    cart_item: CartItemCreate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(CartItemDB)
        .filter(
            CartItemDB.user_id == current_user.id,
            CartItemDB.product_id == cart_item.product_id,
        )
        .first()
    )

    if existing:
        existing.quantity += cart_item.quantity
        existing.updated_at = datetime.utcnow()
        existing.abandoned_email_sent_at = None
        db.commit()
        db.refresh(existing)
        return (
            db.query(CartItemDB)
            .options(joinedload(CartItemDB.product))
            .filter(CartItemDB.id == existing.id)
            .first()
        )

    new_item = CartItemDB(
        user_id=current_user.id,
        product_id=cart_item.product_id,
        quantity=cart_item.quantity,
        selected=cart_item.selected,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return (
        db.query(CartItemDB)
        .options(joinedload(CartItemDB.product))
        .filter(CartItemDB.id == new_item.id)
        .first()
    )


@router.put("/cart/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: int,
    item_update: CartItemUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_item = (
        db.query(CartItemDB)
        .filter(CartItemDB.id == item_id, CartItemDB.user_id == current_user.id)
        .first()
    )
    if not db_item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if item_update.quantity is not None:
        if item_update.quantity <= 0:
            db.delete(db_item)
            db.commit()
            return Response(status_code=204)
        db_item.quantity = item_update.quantity
    if item_update.selected is not None:
        db_item.selected = item_update.selected

    db_item.updated_at = datetime.utcnow()
    db_item.abandoned_email_sent_at = None
    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/cart")
async def clear_cart(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clear all items from the current user's cart in the database."""
    deleted_count = (
        db.query(CartItemDB)
        .filter(CartItemDB.user_id == current_user.id)
        .delete()
    )
    db.commit()
    return {"message": f"Cart cleared successfully ({deleted_count} items removed)"}


@router.delete("/cart/{item_id}")
async def remove_from_cart(
    item_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(CartItemDB)
        .filter(CartItemDB.id == item_id, CartItemDB.user_id == current_user.id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Removed from cart"}


@router.post("/cart/merge")
async def merge_cart(
    merge_request: CartMergeRequest,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Merge guest cart items into the user's permanent cart, validating any bundles."""
    for item in merge_request.items:
        valid_bundle_id = None
        if item.bundle_id:
            bundle = db.query(BundleDB).filter(BundleDB.id == item.bundle_id).first()
            if bundle and bundle.is_active:
                now = datetime.now(bundle.expiry_date.tzinfo) if bundle.expiry_date and bundle.expiry_date.tzinfo else datetime.utcnow()
                if not (bundle.expiry_date and now > bundle.expiry_date):
                    if not (bundle.usage_limit and (bundle.used_count or 0) >= bundle.usage_limit):
                        valid_bundle_id = bundle.id

        existing = (
            db.query(CartItemDB)
            .filter(
                CartItemDB.user_id == current_user.id,
                CartItemDB.product_id == item.product_id,
                CartItemDB.bundle_id == valid_bundle_id,
            )
            .first()
        )

        if existing:
            existing.quantity += item.quantity
            existing.abandoned_email_sent_at = None
        else:
            new_item = CartItemDB(
                user_id=current_user.id,
                product_id=item.product_id,
                bundle_id=valid_bundle_id,
                quantity=item.quantity,
                selected=item.selected,
            )
            db.add(new_item)

    db.commit()
    return {"message": "Cart merged successfully"}


@router.post("/cart/bundle/{bundle_id}")
async def add_bundle_to_cart(
    bundle_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bundle = (
        db.query(BundleDB)
        .options(joinedload(BundleDB.products))
        .filter(BundleDB.id == bundle_id)
        .first()
    )
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    if not bundle.is_active:
        raise HTTPException(status_code=400, detail="This bundle is inactive")

    if bundle.expiry_date:
        now = datetime.now(bundle.expiry_date.tzinfo) if bundle.expiry_date.tzinfo else datetime.utcnow()
        if now > bundle.expiry_date:
            raise HTTPException(status_code=400, detail="This bundle has expired")

    if bundle.usage_limit and (bundle.used_count or 0) >= bundle.usage_limit:
        raise HTTPException(status_code=400, detail="This bundle has reached its usage limit")

    for bp in bundle.products:
        existing = (
            db.query(CartItemDB)
            .filter(
                CartItemDB.user_id == current_user.id,
                CartItemDB.product_id == bp.product_id,
                CartItemDB.bundle_id == bundle_id,
            )
            .first()
        )

        if existing:
            existing.quantity += 1
            existing.updated_at = datetime.utcnow()
        else:
            new_item = CartItemDB(
                user_id=current_user.id,
                product_id=bp.product_id,
                bundle_id=bundle_id,
                quantity=1,
                selected=True,
            )
            db.add(new_item)

    db.commit()
    return {"message": f"Bundle '{bundle.name}' added to cart"}
