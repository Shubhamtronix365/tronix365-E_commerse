from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from database import get_db
from models import (
    CategoryDB,
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    UserDB,
)
from deps import get_current_admin

router = APIRouter(tags=["Categories"])


async def _invalidate_category_cache():
    try:
        await FastAPICache.clear(namespace="categories")
    except Exception as e:
        print(f"Warning: Failed to clear categories cache: {e}")


@router.get("/categories", response_model=List[CategoryResponse])
@cache(expire=60, namespace="categories")
async def get_categories(db: Session = Depends(get_db)):
    """Fetch all active categories ordered by sort_order."""
    return db.query(CategoryDB).order_by(CategoryDB.sort_order.asc(), CategoryDB.id.asc()).all()


@router.post("/admin/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    existing = db.query(CategoryDB).filter(func.lower(CategoryDB.name) == category.name.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    new_cat = CategoryDB(
        name=category.name.strip(),
        icon=category.icon or "Package",
        color=category.color or "from-slate-400 to-slate-600",
        sort_order=category.sort_order or 0,
        is_active=category.is_active if category.is_active is not None else True,
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    await _invalidate_category_cache()
    return new_cat


@router.put("/admin/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    cat = db.query(CategoryDB).filter(CategoryDB.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if category_update.name is not None:
        cat.name = category_update.name.strip()
    if category_update.icon is not None:
        cat.icon = category_update.icon
    if category_update.color is not None:
        cat.color = category_update.color
    if category_update.sort_order is not None:
        cat.sort_order = category_update.sort_order
    if category_update.is_active is not None:
        cat.is_active = category_update.is_active

    db.commit()
    db.refresh(cat)
    await _invalidate_category_cache()
    return cat


@router.delete("/admin/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    cat = db.query(CategoryDB).filter(CategoryDB.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(cat)
    db.commit()
    await _invalidate_category_cache()
    return {"message": "Category deleted successfully"}
