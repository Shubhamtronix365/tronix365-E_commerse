import re
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from database import get_db
from models import ProductDB

router = APIRouter(tags=["BOM"])


class BOMItemInput(BaseModel):
    query: str
    quantity: int = Field(default=1, ge=1)
    sku: Optional[str] = None


class BOMMatchRequest(BaseModel):
    items: List[BOMItemInput]


class MatchedProductItem(BaseModel):
    id: int
    title: str
    price: float
    sale_price: Optional[float] = None
    stock: int
    image: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None


class BOMItemResult(BaseModel):
    original_query: str
    requested_quantity: int
    status: str  # "exact_match", "partial_match", "out_of_stock", "not_found"
    matched_product: Optional[MatchedProductItem] = None
    in_stock: bool = False
    stock_available: int = 0
    alternatives: List[MatchedProductItem] = []


class BOMMatchResponse(BaseModel):
    total_requested: int
    matched_count: int
    unmatched_count: int
    in_stock_count: int
    estimated_total: float
    results: List[BOMItemResult]


def clean_search_tokens(text: str) -> List[str]:
    """Clean and extract meaningful keywords for fuzzy matching."""
    cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
    tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 1]
    return tokens


@router.post("/bom/match", response_model=BOMMatchResponse)
async def match_bom_items(
    request: BOMMatchRequest,
    db: Session = Depends(get_db),
):
    """
    Match an uploaded BOM (Bill of Materials) list of components against the catalog.
    Handles exact SKU lookups, title substrings, and multi-keyword token matching.
    """
    results: List[BOMItemResult] = []
    matched_count = 0
    unmatched_count = 0
    in_stock_count = 0
    estimated_total = 0.0

    for item in request.items:
        raw_query = (item.query or "").strip()
        qty = max(1, item.quantity)
        sku_query = (item.sku or "").strip()

        if not raw_query and not sku_query:
            continue

        matched_p: Optional[ProductDB] = None
        match_type = "not_found"
        alternatives: List[ProductDB] = []

        # 1. Exact SKU Match
        if sku_query:
            matched_p = db.query(ProductDB).filter(ProductDB.skv.ilike(sku_query)).first()
            if matched_p:
                match_type = "exact_match"

        # 2. Try raw_query as exact SKU if not matched yet
        if not matched_p and raw_query:
            matched_p = db.query(ProductDB).filter(ProductDB.skv.ilike(raw_query)).first()
            if matched_p:
                match_type = "exact_match"

        # 3. Exact Substring in Product Title
        if not matched_p and raw_query:
            matched_p = (
                db.query(ProductDB)
                .filter(ProductDB.title.ilike(f"%{raw_query}%"))
                .order_by(ProductDB.stock.desc())
                .first()
            )
            if matched_p:
                match_type = "exact_match"

        # 4. Multi-token keyword search
        if not matched_p and raw_query:
            tokens = clean_search_tokens(raw_query)
            if tokens:
                token_filters = [ProductDB.title.ilike(f"%{token}%") for token in tokens]
                matched_p = (
                    db.query(ProductDB)
                    .filter(or_(*token_filters))
                    .order_by(ProductDB.stock.desc())
                    .first()
                )
                if matched_p:
                    match_type = "partial_match"

        # 5. Fetch alternatives if matched
        if matched_p:
            alts_query = (
                db.query(ProductDB)
                .filter(ProductDB.id != matched_p.id)
                .filter(ProductDB.category == matched_p.category)
                .order_by(ProductDB.stock.desc())
                .limit(3)
                .all()
            )
            alternatives = alts_query

        # Calculate result metrics
        if matched_p:
            matched_count += 1
            has_sufficient_stock = (matched_p.stock or 0) >= qty
            if has_sufficient_stock:
                in_stock_count += 1
            elif (matched_p.stock or 0) <= 0:
                match_type = "out_of_stock"

            unit_price = matched_p.sale_price if matched_p.sale_price is not None else matched_p.price
            estimated_total += float(unit_price or 0) * qty

            product_item = MatchedProductItem(
                id=matched_p.id,
                title=matched_p.title,
                price=float(matched_p.price or 0),
                sale_price=float(matched_p.sale_price) if matched_p.sale_price is not None else None,
                stock=int(matched_p.stock or 0),
                image=matched_p.image,
                sku=matched_p.skv,
                category=matched_p.category,
            )

            alt_items = [
                MatchedProductItem(
                    id=a.id,
                    title=a.title,
                    price=float(a.price or 0),
                    sale_price=float(a.sale_price) if a.sale_price is not None else None,
                    stock=int(a.stock or 0),
                    image=a.image,
                    sku=a.skv,
                    category=a.category,
                )
                for a in alternatives
            ]

            results.append(
                BOMItemResult(
                    original_query=raw_query or sku_query,
                    requested_quantity=qty,
                    status=match_type,
                    matched_product=product_item,
                    in_stock=has_sufficient_stock,
                    stock_available=int(matched_p.stock or 0),
                    alternatives=alt_items,
                )
            )
        else:
            unmatched_count += 1
            results.append(
                BOMItemResult(
                    original_query=raw_query or sku_query,
                    requested_quantity=qty,
                    status="not_found",
                    matched_product=None,
                    in_stock=False,
                    stock_available=0,
                    alternatives=[],
                )
            )

    return BOMMatchResponse(
        total_requested=len(results),
        matched_count=matched_count,
        unmatched_count=unmatched_count,
        in_stock_count=in_stock_count,
        estimated_total=round(estimated_total, 2),
        results=results,
    )
