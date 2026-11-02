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
from logging_config import get_logger

logger = get_logger("cart")
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
        logger.warning_event(
            module="CART",
            event="CART_BUNDLE_AUTO_HEALED",
            message=f"Cart bundle status changed for user #{current_user.id}: {'; '.join(warnings)}",
            action="Removed invalidated promotional bundles and preserved products at base price",
            result="HEALED",
            user_id=current_user.id,
        )

    if warnings:
        import urllib.parse
        response.headers["X-Cart-Warnings"] = urllib.parse.quote("; ".join(warnings))
        response.headers["Access-Control-Expose-Headers"] = "X-Cart-Warnings"

    logger.info_event(
        module="CART",
        event="CART_FETCHED",
        message=f"Customer #{current_user.id} retrieved shopping cart ({len(items)} items)",
        action="Loaded active cart items",
        result="SUCCESS",
        user_id=current_user.id,
        items_count=len(items),
    )

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
        logger.info_event(
            module="CART",
            event="PRODUCT_QUANTITY_INCREMENTED",
            message=f"Customer #{current_user.id} increased quantity for product #{cart_item.product_id} by {cart_item.quantity} (Total: {existing.quantity})",
            action="Updated existing CartItemDB record",
            result="UPDATED",
            user_id=current_user.id,
            product_id=cart_item.product_id,
            new_quantity=existing.quantity,
        )
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

    logger.info_event(
        module="CART",
        event="PRODUCT_ADDED_TO_CART",
        message=f"Customer #{current_user.id} added product #{cart_item.product_id} (qty: {cart_item.quantity}) to shopping cart",
        action="Created new CartItemDB record",
        result="CREATED",
        user_id=current_user.id,
        product_id=cart_item.product_id,
        quantity=cart_item.quantity,
    )

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
        logger.warning_event(
            module="CART",
            event="CART_ITEM_NOT_FOUND",
            message=f"Cart item #{item_id} not found for customer #{current_user.id}",
            action="Rejected cart item update",
            result="NOT_FOUND",
            user_id=current_user.id,
            item_id=item_id,
        )
        raise HTTPException(status_code=404, detail="Cart item not found")

    if item_update.quantity is not None:
        if item_update.quantity <= 0:
            pid = db_item.product_id
            db.delete(db_item)
            db.commit()
            logger.info_event(
                module="CART",
                event="PRODUCT_REMOVED_VIA_ZERO_QUANTITY",
                message=f"Customer #{current_user.id} set quantity <= 0 on cart item #{item_id} (Product #{pid}); item removed",
                action="Deleted CartItemDB record",
                result="REMOVED",
                user_id=current_user.id,
                item_id=item_id,
                product_id=pid,
            )
            return Response(status_code=204)
        db_item.quantity = item_update.quantity
    if item_update.selected is not None:
        db_item.selected = item_update.selected

    db_item.updated_at = datetime.utcnow()
    db_item.abandoned_email_sent_at = None
    db.commit()
    db.refresh(db_item)

    logger.info_event(
        module="CART",
        event="CART_ITEM_MODIFIED",
        message=f"Customer #{current_user.id} modified cart item #{item_id} (quantity: {db_item.quantity}, selected: {db_item.selected})",
        action="Updated CartItemDB attributes",
        result="MODIFIED",
        user_id=current_user.id,
        item_id=item_id,
        quantity=db_item.quantity,
        selected=db_item.selected,
    )

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

    logger.info_event(
        module="CART",
        event="CART_CLEARED",
        message=f"Customer #{current_user.id} cleared shopping cart ({deleted_count} items removed)",
        action="Deleted all CartItemDB records for user",
        result="CLEARED",
        user_id=current_user.id,
        deleted_count=deleted_count,
    )

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
        pid = item.product_id
        db.delete(item)
        db.commit()
        logger.info_event(
            module="CART",
            event="CART_ITEM_DELETED",
            message=f"Customer #{current_user.id} removed item #{item_id} (Product #{pid}) from cart",
            action="Deleted CartItemDB record",
            result="DELETED",
            user_id=current_user.id,
            item_id=item_id,
            product_id=pid,
        )
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
