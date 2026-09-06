import os
import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
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

    if sort_by:
        if sort_by == "price_asc":
            query = query.order_by(ProductDB.price.asc())
        elif sort_by == "price_desc":
            query = query.order_by(ProductDB.price.desc())
        elif sort_by == "name_asc":
            query = query.order_by(ProductDB.title.asc())
        else:
            query = query.order_by(ProductDB.id.desc())
    else:
        query = query.order_by(ProductDB.id.desc())

    products = query.offset(skip).limit(limit).all()
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
    def normalize(s: str) -> str:
        if not s:
            return ""
        t = s.lower()
        t = re.sub(r'[^a-z0-9\s_-]', '', t)
        t = re.sub(r'[\s_-]+', '-', t)
        return t.strip('-')

    target = normalize(slug)
    products = db.query(ProductDB).all()

    found_product = None
    for p in products:
        if p.title and normalize(p.title) == target:
            found_product = p
            break

    if not found_product:
        for p in products:
            if p.skv and (normalize(p.skv) == target or p.skv.lower() == slug.lower()):
                found_product = p
                break

    if not found_product:
        for p in products:
            if p.title and p.title.lower().strip() == slug.lower().strip():
                found_product = p
                break

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

    new_product = ProductDB(**product_dict)
    db.add(new_product)
    db.commit()
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

    for key, value in product_data.items():
        setattr(db_product, key, value)

    if "price" in product_data:
        db_product.sale_price = db_product.price

    db.commit()
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
