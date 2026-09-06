from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import ProductDB, ReviewDB, ReviewCreate, ReviewResponse, UserDB
from deps import get_current_user

router = APIRouter(tags=["Reviews"])


@router.post("/products/{product_id}/reviews", response_model=ReviewResponse)
async def create_review(
    product_id: int,
    review: ReviewCreate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_review = ReviewDB(
        product_id=product_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name or "Anonymous",
        rating=review.rating,
        comment=review.comment,
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review


@router.get("/products/{product_id}/reviews", response_model=List[ReviewResponse])
async def get_reviews(product_id: int, db: Session = Depends(get_db)):
    return db.query(ReviewDB).filter(ReviewDB.product_id == product_id).all()
