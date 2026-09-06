from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import WishlistItemDB, WishlistCreate, WishlistResponse, UserDB
from deps import get_current_user

router = APIRouter(tags=["Wishlist"])


@router.get("/wishlist", response_model=List[WishlistResponse])
async def get_wishlist(
    current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(WishlistItemDB)
        .options(joinedload(WishlistItemDB.product))
        .filter(WishlistItemDB.user_id == current_user.id)
        .all()
    )


@router.post("/wishlist", response_model=WishlistResponse)
async def add_to_wishlist(
    wishlist: WishlistCreate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(WishlistItemDB)
        .filter(
            WishlistItemDB.user_id == current_user.id,
            WishlistItemDB.product_id == wishlist.product_id,
        )
        .first()
    )
    if existing:
        return (
            db.query(WishlistItemDB)
            .options(joinedload(WishlistItemDB.product))
            .filter(WishlistItemDB.id == existing.id)
            .first()
        )

    new_item = WishlistItemDB(user_id=current_user.id, product_id=wishlist.product_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return (
        db.query(WishlistItemDB)
        .options(joinedload(WishlistItemDB.product))
        .filter(WishlistItemDB.id == new_item.id)
        .first()
    )


@router.delete("/wishlist/{product_id}")
async def remove_from_wishlist(
    product_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(WishlistItemDB)
        .filter(
            WishlistItemDB.user_id == current_user.id,
            WishlistItemDB.product_id == product_id,
        )
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Removed from wishlist"}
