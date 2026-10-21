import os
import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from sqlalchemy.exc import IntegrityError
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache

from database import get_db
from models import (
    Product,
    ProductDB,
    ProductCreate,
    ProductUpdate,
    WishlistItemDB,
    CartItemDB,
    ReviewDB,
    BundleProductDB,
    OrderItemDB,
    UserDB,
)
from deps import get_current_admin
from services.media_service import is_cloudinary_enabled, upload_to_cloudinary

router = APIRouter(tags=["Products"])


def _normalize_product_image(img_val: Optional[str]) -> Optional[str]:
    """Auto-upload local product images to Cloudinary CDN if configured."""
    if not img_val or not isinstance(img_val, str) or not is_cloudinary_enabled():
        return img_val
    clean = img_val.strip()
    if clean.startswith("http://") or clean.startswith("https://") or clean.startswith("data:"):
        return clean
    filename = os.path.basename(clean.lstrip("/"))
    local_path = os.path.join("uploads", filename)
    if os.path.exists(local_path):
        c_url = upload_to_cloudinary(local_path, folder="tronix365_products", resource_type="image")
        if c_url:
            return c_url
    return clean


def get_product_variants_list(product, db: Session):
    target_parent_id = product.parent_id
    if not target_parent_id:
        return []
    
    siblings = (
        db.query(ProductDB)
        .filter(ProductDB.parent_id == target_parent_id)
        .order_by(ProductDB.id.asc())
        .all()
    )
    
    variant_data = []
    for v in siblings:
        variant_data.append({
            "id": v.id,
            "title": v.title,
            "price": v.price,
            "stock": v.stock,
            "variant_name": v.variant_name or v.title,
            "variant_type": v.variant_type or "Option",
            "image": v.image
        })
    return variant_data


@router.get("/products", response_model=List[Product])
async def get_products(
    response: Response,
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: Optional[str] = None,
    search: Optional[str] = None,
    in_stock_only: bool = False,
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    query = db.query(ProductDB)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (ProductDB.title.ilike(search_term))
            | (ProductDB.description.ilike(search_term))
            | (ProductDB.category.ilike(search_term))
            | (ProductDB.skv.ilike(search_term))
            | (ProductDB.sku.ilike(search_term))
        )

    if category and category != "All":
        formatted_cat = category.replace('-', ' ')
        query = query.filter(
            (ProductDB.category == category)
            | (ProductDB.category.ilike(category))
            | (ProductDB.category.ilike(formatted_cat))
        )

    if min_price is not None:
        query = query.filter(ProductDB.price >= min_price)

    if max_price is not None:
        query = query.filter(ProductDB.price <= max_price)

    if in_stock_only:
        query = query.filter(ProductDB.stock > 0)

    # Always ensure products with pending prices appear at the very end of lists
    from sqlalchemy import case

    pending_order = case((ProductDB.is_price_pending == True, 1), else_=0)

    if sort_by:
        if sort_by == "price_asc":
            query = query.order_by(pending_order.asc(), ProductDB.price.asc())
        elif sort_by == "price_desc":
            query = query.order_by(pending_order.asc(), ProductDB.price.desc())
        elif sort_by == "name_asc":
            query = query.order_by(pending_order.asc(), ProductDB.title.asc())
        elif sort_by == "name_desc":
            query = query.order_by(pending_order.asc(), ProductDB.title.desc())
        elif sort_by == "stock_asc":
            query = query.order_by(pending_order.asc(), ProductDB.stock.asc())
        elif sort_by == "stock_desc":
            query = query.order_by(pending_order.asc(), ProductDB.stock.desc())
        elif sort_by == "id_asc":
            query = query.order_by(pending_order.asc(), ProductDB.id.asc())
        else:
            query = query.order_by(pending_order.asc(), ProductDB.id.desc())
    else:
        query = query.order_by(pending_order.asc(), ProductDB.id.desc())

    total_count = query.count()
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    if limit is not None and limit > 0:
        products = query.offset(skip).limit(limit).all()
    else:
        products = query.offset(skip).all()
    return products


@router.get("/products/search", response_model=List[Product])
@cache(expire=300, namespace="products")
async def search_products(q: str = "", db: Session = Depends(get_db)):
    """Search products by title, description, or category with flexible word matching."""
    if not q:
        return []

    words = q.strip().split()
    if not words:
        return []

    word_filters = []
    for word in words:
        search_term = f"%{word}%"
        word_filters.append(
            or_(
                ProductDB.title.ilike(search_term),
                ProductDB.description.ilike(search_term),
                ProductDB.category.ilike(search_term),
            )
        )

    products = db.query(ProductDB).filter(and_(*word_filters)).limit(15).all()
    return products


@router.get("/products/recommendations/{product_id}", response_model=List[Product])
@cache(expire=3600, namespace="products")
async def get_recommendations(product_id: int, db: Session = Depends(get_db)):
    """Get related products based on category."""
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    recommendations = (
        db.query(ProductDB)
        .filter(ProductDB.category == product.category, ProductDB.id != product_id)
        .limit(4)
        .all()
    )

    if len(recommendations) < 4:
        fill = (
            db.query(ProductDB)
            .filter(
                ProductDB.id != product_id,
                ProductDB.id.notin_([r.id for r in recommendations]),
            )
            .order_by(ProductDB.id.desc())
            .limit(4 - len(recommendations))
            .all()
        )
        recommendations.extend(fill)

    return recommendations


@router.get("/products/{product_id}", response_model=Product)
@cache(expire=3600, namespace="products")
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.variants = get_product_variants_list(product, db)
    return product


@router.get("/products/slug/{slug}", response_model=Product)
@cache(expire=3600, namespace="products")
async def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    import html, re

    def clean_slug(s: str) -> str:
        if not s:
            return ""
        s = html.unescape(str(s)).lower().strip()
        s = re.sub(r'&amp;', ' and ', s, flags=re.IGNORECASE)
        s = re.sub(r'&', ' and ', s)
        s = re.sub(r'\.', '-', s)
        s = re.sub(r'[\s_]+', '-', s)
        s = re.sub(r'[^a-z0-9-]', '', s)
        s = re.sub(r'-+', '-', s)
        return s.strip('-')

    def frontend_slug(s: str) -> str:
        if not s:
            return ""
        s = html.unescape(str(s)).lower().strip()
        s = re.sub(r'&amp;', '', s, flags=re.IGNORECASE)
        s = re.sub(r'&', '', s)
        s = re.sub(r'\.', '-', s)
        s = re.sub(r'_', '-', s)
        s = re.sub(r'\s+', '-', s)
        s = re.sub(r'[^\w\-]+', '', s)
        s = re.sub(r'\-\-+', '-', s)
        return s.strip('-')

    def strip_connectors(s_val: str) -> str:
        t = re.sub(r'-(and|amp)-', '-', f"-{s_val}-")
        t = re.sub(r'-+', '-', t)
        return t.strip('-')

    slug_raw = slug.strip().lower()

    # 1. Direct ID check
    if slug_raw.isdigit():
        p_by_id = db.query(ProductDB).filter(ProductDB.id == int(slug_raw)).first()
        if p_by_id:
            p_by_id.variants = get_product_variants_list(p_by_id, db)
            return p_by_id

    # 2. SKV / SKU exact match
    p_by_skv = db.query(ProductDB).filter(
        or_(
            ProductDB.skv.ilike(slug_raw),
            ProductDB.sku.ilike(slug_raw)
        )
    ).first()
    if p_by_skv:
        p_by_skv.variants = get_product_variants_list(p_by_skv, db)
        return p_by_skv

    products = db.query(ProductDB).all()
    found_product = None

    # 3. Clean slug exact match
    target_clean = clean_slug(slug_raw)
    for p in products:
        if p.title and clean_slug(p.title) == target_clean:
            found_product = p
            break

    # 4. Frontend slug exact match
    if not found_product:
        target_fe = frontend_slug(slug_raw)
        for p in products:
            if p.title and frontend_slug(p.title) == target_fe:
                found_product = p
                break

    # 5. Connector-stripped match (-and- / -amp-)
    if not found_product:
        target_stripped = strip_connectors(target_clean)
        for p in products:
            if p.title and strip_connectors(clean_slug(p.title)) == target_stripped:
                found_product = p
                break
        if not found_product:
            for p in products:
                if p.title and strip_connectors(frontend_slug(p.title)) == target_stripped:
                    found_product = p
                    break

    # 6. Stopwords-free token match
    if not found_product:
        STOPWORDS = {'and', 'amp', 'for', 'with', 'the', 'in', 'of', 'to'}
        target_tokens = set(re.findall(r'[a-z0-9]+', slug_raw)) - STOPWORDS
        if target_tokens:
            for p in products:
                if p.title:
                    p_tokens = set(re.findall(r'[a-z0-9]+', p.title.lower())) - STOPWORDS
                    if target_tokens == p_tokens:
                        found_product = p
                        break

    # 7. Fallback word-overlap match (if user slug is >= 75% similar)
    if not found_product:
        target_words = set(re.findall(r'[a-z0-9]{2,}', slug_raw))
        best_match = None
        best_score = 0.0
        if target_words:
            for p in products:
                if p.title:
                    p_words = set(re.findall(r'[a-z0-9]{2,}', p.title.lower()))
                    intersection = target_words & p_words
                    if intersection:
                        score = len(intersection) / max(len(target_words), len(p_words))
                        if score > best_score and score >= 0.75:
                            best_score = score
                            best_match = p
        if best_match:
            found_product = best_match

    if not found_product:
        raise HTTPException(status_code=404, detail="Product not found")

    found_product.variants = get_product_variants_list(found_product, db)
    return found_product


@router.post("/products", response_model=Product, status_code=201)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    product_dict = product.dict()
    if product_dict.get("image"):
        product_dict["image"] = _normalize_product_image(product_dict["image"])

    # Ensure sku and skv are synchronized
    if product_dict.get("sku") and not product_dict.get("skv"):
        product_dict["skv"] = product_dict["sku"]
    elif product_dict.get("skv") and not product_dict.get("sku"):
        product_dict["sku"] = product_dict["skv"]

    new_product = ProductDB(**product_dict)
    db.add(new_product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Product SKU/SKV is already in use by another product.")

    db.refresh(new_product)
    await FastAPICache.clear(namespace="products")
    return new_product


@router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_id: int,
    product: ProductUpdate,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    db_product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    product_data = product.dict(exclude_unset=True)
    if "image" in product_data and product_data["image"]:
        product_data["image"] = _normalize_product_image(product_data["image"])

    # Synchronize sku and skv across the product record
    if "sku" in product_data:
        new_sku = product_data["sku"]
        if "skv" not in product_data or not product_data["skv"] or product_data.get("skv") == db_product.skv:
            product_data["skv"] = new_sku
    elif "skv" in product_data:
        if "sku" not in product_data or not product_data["sku"]:
            product_data["sku"] = product_data["skv"]

    for key, value in product_data.items():
        setattr(db_product, key, value)

    if "price" in product_data:
        db_product.sale_price = db_product.price

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Product SKU/SKV is already in use by another product.")

    db.refresh(db_product)
    await FastAPICache.clear(namespace="products")
    return db_product


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    db_product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.query(WishlistItemDB).filter(WishlistItemDB.product_id == product_id).delete()
    db.query(CartItemDB).filter(CartItemDB.product_id == product_id).delete()
    db.query(ReviewDB).filter(ReviewDB.product_id == product_id).delete()
    db.query(BundleProductDB).filter(BundleProductDB.product_id == product_id).delete()
    db.query(OrderItemDB).filter(OrderItemDB.product_id == product_id).update({OrderItemDB.product_id: None})

    db.delete(db_product)
    db.commit()
    await FastAPICache.clear(namespace="products")
    return None
