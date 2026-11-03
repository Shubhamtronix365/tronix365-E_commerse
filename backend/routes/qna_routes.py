from datetime import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import (
    ProductDB,
    ProductQnADB,
    QnACreate,
    QnAAnswer,
    QnAAdminCreate,
    QnAResponse,
    UserDB,
)
from deps import get_current_user, get_current_admin
from logging_config import get_logger

router = APIRouter(tags=["Product Q&A"])
logger = get_logger("qna")


def _format_qna_response(qna: ProductQnADB, product: Optional[ProductDB] = None) -> dict:
    created_str = None
    if qna.created_at:
        created_str = (
            qna.created_at.isoformat()
            if hasattr(qna.created_at, "isoformat")
            else str(qna.created_at)
        )

    res = {
        "id": qna.id,
        "product_id": qna.product_id,
        "user_id": qna.user_id,
        "user_name": qna.user_name or "Customer",
        "user_email": qna.user_email,
        "question": qna.question,
        "answer": qna.answer,
        "answered_by": qna.answered_by,
        "answered_at": qna.answered_at,
        "is_faq": bool(qna.is_faq),
        "created_at": created_str,
        "product_title": product.title if product else None,
        "product_sku": (product.sku or product.skv) if product else None,
        "product_image": product.image if product else None,
    }
    return res


# ==========================================
# 1. PUBLIC PRODUCT Q&A (GLOBAL VISIBILITY)
# ==========================================
@router.get("/products/{product_id}/qna")
async def get_product_qna(
    product_id: int,
    db: Session = Depends(get_db),
):
    """
    Globally visible list of questions and answers for a specific product.
    Returns pinned FAQs first, followed by newest answered questions and community queries.
    """
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Order: FAQs first, then answered questions, then latest
    qna_list = (
        db.query(ProductQnADB)
        .filter(ProductQnADB.product_id == product_id)
        .order_by(
            ProductQnADB.is_faq.desc(),
            ProductQnADB.answer.isnot(None).desc(),
            ProductQnADB.id.desc(),
        )
        .all()
    )

    return [_format_qna_response(q, product) for q in qna_list]


# ==========================================
# 2. SUBMIT QUESTION (LOGGED-IN USERS ONLY)
# ==========================================
@router.post("/products/{product_id}/qna", status_code=status.HTTP_201_CREATED)
async def ask_product_question(
    product_id: int,
    payload: QnACreate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Allows authenticated users to ask a technical or pre-sale question on a product.
    """
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    clean_question = payload.question.strip()
    if not clean_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty",
        )

    author_name = current_user.full_name or current_user.email.split("@")[0]

    new_qna = ProductQnADB(
        product_id=product_id,
        user_id=current_user.id,
        user_name=author_name,
        user_email=current_user.email,
        question=clean_question,
        answer=None,
        answered_by=None,
        answered_at=None,
        is_faq=False,
    )
    db.add(new_qna)
    db.commit()
    db.refresh(new_qna)

    logger.info_event(
        module="QNA",
        event="QUESTION_SUBMITTED",
        message=f"Question submitted for product '{product.title}' by {current_user.email}",
        product_id=str(product_id),
        user_id=str(current_user.id),
        action="Question saved to database; awaiting technical team reply",
        result="SUCCESS",
    )

    return _format_qna_response(new_qna, product)


# ==========================================
# 3. ADMIN: ANSWER A QUESTION
# ==========================================
@router.put("/qna/{qna_id}/answer")
async def answer_product_question(
    qna_id: int,
    payload: QnAAnswer,
    current_admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Allows store admins to publish or update an official answer to a customer question.
    """
    qna = db.query(ProductQnADB).filter(ProductQnADB.id == qna_id).first()
    if not qna:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    product = db.query(ProductDB).filter(ProductDB.id == qna.product_id).first()

    clean_answer = payload.answer.strip()
    if not clean_answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer cannot be empty",
        )

    responder_name = (
        current_admin.full_name or "Tronix365 Technical Support"
    )

    qna.answer = clean_answer
    qna.answered_by = responder_name
    qna.answered_at = datetime.utcnow().isoformat()
    if payload.is_faq is not None:
        qna.is_faq = payload.is_faq

    db.commit()
    db.refresh(qna)

    logger.info_event(
        module="QNA",
        event="QUESTION_ANSWERED",
        message=f"Admin answered Q&A #{qna_id} for product #{qna.product_id}",
        product_id=str(qna.product_id),
        user_id=str(current_admin.id),
        action="Official answer published and visible globally",
        result="SUCCESS",
    )

    return _format_qna_response(qna, product)


# ==========================================
# 4. ADMIN: DELETE A QUESTION / FAQ
# ==========================================
@router.delete("/qna/{qna_id}")
async def delete_product_question(
    qna_id: int,
    current_admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Allows store admins to delete a spam, invalid, or obsolete question.
    """
    qna = db.query(ProductQnADB).filter(ProductQnADB.id == qna_id).first()
    if not qna:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    db.delete(qna)
    db.commit()

    logger.info_event(
        module="QNA",
        event="QUESTION_DELETED",
        message=f"Admin deleted Q&A #{qna_id}",
        user_id=str(current_admin.id),
        action="Record permanently deleted",
        result="SUCCESS",
    )

    return {"message": "Question deleted successfully", "id": qna_id}


# ==========================================
# 5. ADMIN: GLOBAL Q&A MANAGEMENT FEED
# ==========================================
@router.get("/admin/qna")
async def get_all_qna_admin(
    product_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),  # 'pending', 'answered', 'all'
    search: Optional[str] = Query(None),
    current_admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin control feed to inspect, filter, answer, and manage all questions across products.
    """
    query = (
        db.query(ProductQnADB, ProductDB)
        .outerjoin(ProductDB, ProductQnADB.product_id == ProductDB.id)
    )

    if product_id:
        query = query.filter(ProductQnADB.product_id == product_id)

    if status == "pending":
        query = query.filter(
            or_(
                ProductQnADB.answer.is_(None),
                ProductQnADB.answer == "",
            )
        )
    elif status == "answered":
        query = query.filter(
            ProductQnADB.answer.isnot(None),
            ProductQnADB.answer != "",
        )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ProductQnADB.question.ilike(term),
                ProductQnADB.answer.ilike(term),
                ProductQnADB.user_name.ilike(term),
                ProductQnADB.user_email.ilike(term),
                ProductDB.title.ilike(term),
            )
        )

    # Order: pending questions first, then newest
    query = query.order_by(
        ProductQnADB.answer.is_(None).desc(),
        ProductQnADB.id.desc(),
    )

    results = query.all()
    return [_format_qna_response(qna, prod) for qna, prod in results]


# ==========================================
# 6. ADMIN: ADD PRE-POPULATED FAQ FOR PRODUCT
# ==========================================
@router.post("/admin/qna", status_code=status.HTTP_201_CREATED)
async def create_faq_admin(
    payload: QnAAdminCreate,
    current_admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Allows store admin to proactively add common FAQs and official answers for any product.
    """
    product = db.query(ProductDB).filter(ProductDB.id == payload.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    clean_question = payload.question.strip()
    clean_answer = payload.answer.strip() if payload.answer else None

    new_faq = ProductQnADB(
        product_id=payload.product_id,
        user_id=current_admin.id,
        user_name="Tronix365 Official Desk",
        user_email=current_admin.email,
        question=clean_question,
        answer=clean_answer,
        answered_by=(
            current_admin.full_name or "Tronix365 Technical Support"
        )
        if clean_answer
        else None,
        answered_at=datetime.utcnow().isoformat() if clean_answer else None,
        is_faq=bool(payload.is_faq),
    )
    db.add(new_faq)
    db.commit()
    db.refresh(new_faq)

    logger.info_event(
        module="QNA",
        event="FAQ_CREATED",
        message=f"Admin created FAQ for product '{product.title}'",
        product_id=str(payload.product_id),
        user_id=str(current_admin.id),
        action="Pre-populated FAQ created and published to storefront",
        result="SUCCESS",
    )

    return _format_qna_response(new_faq, product)
