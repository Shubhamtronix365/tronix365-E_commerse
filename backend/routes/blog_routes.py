import re
import math
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel

from database import get_db
from models import (
    BlogPostDB,
    BlogPostCreate,
    BlogPostUpdate,
    BlogPostResponse,
    BlogPostDetailResponse,
    BlogPostListResponse,
    UserDB,
    RefreshTokenDB,
)
from deps import get_current_blog_author, limiter
from auth import verify_password, create_access_token, create_refresh_token, REFRESH_TOKEN_EXPIRE_DAYS
from utils import sanitize_blog_html

router = APIRouter(tags=["Blogs"])


class BlogAuthorLoginRequest(BaseModel):
    author_id: str
    password: str



def slugify(text: str) -> str:
    """Generate a clean URL slug from title string."""
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text or "post"


def get_unique_slug(db: Session, base_slug: str, exclude_id: Optional[int] = None) -> str:
    """Ensure slug is unique across all blog posts by appending numeric suffixes if collision occurs."""
    candidate = base_slug
    counter = 1
    while True:
        query = db.query(BlogPostDB).filter(BlogPostDB.slug == candidate)
        if exclude_id:
            query = query.filter(BlogPostDB.id != exclude_id)
        if not query.first():
            return candidate
        counter += 1
        candidate = f"{base_slug}-{counter}"


# =====================================================================
# PUBLIC BLOG ENDPOINTS
# =====================================================================

@router.get("/blogs", response_model=BlogPostListResponse)
async def get_published_blogs(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    category: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    layout: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retrieve published blog posts with filtering, searching, and pagination."""
    query = db.query(BlogPostDB).filter(BlogPostDB.is_published == True)

    if category and category.lower() != "all":
        query = query.filter(BlogPostDB.category.ilike(f"%{category}%"))

    if layout:
        query = query.filter(BlogPostDB.layout_type == layout)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                BlogPostDB.title.ilike(search_term),
                BlogPostDB.summary.ilike(search_term),
            )
        )

    # In-memory or JSON search for tag if provided
    if tag:
        tag_term = f"%{tag}%"
        query = query.filter(BlogPostDB.tags.cast(BlogPostDB.title.type).ilike(tag_term))

    total = query.count()
    total_pages = max(1, math.ceil(total / limit))
    offset = (page - 1) * limit

    posts = query.order_by(BlogPostDB.created_at.desc()).offset(offset).limit(limit).all()

    return BlogPostListResponse(
        posts=posts,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/blogs/featured", response_model=List[BlogPostResponse])
async def get_featured_blogs(limit: int = Query(3, ge=1, le=10), db: Session = Depends(get_db)):
    """Retrieve spotlight / featured blog posts for hero banners."""
    posts = (
        db.query(BlogPostDB)
        .filter(BlogPostDB.is_published == True, BlogPostDB.featured == True)
        .order_by(BlogPostDB.created_at.desc())
        .limit(limit)
        .all()
    )

    # Fallback to latest posts if no posts are marked as featured
    if not posts:
        posts = (
            db.query(BlogPostDB)
            .filter(BlogPostDB.is_published == True)
            .order_by(BlogPostDB.created_at.desc())
            .limit(limit)
            .all()
        )

    return posts


@router.get("/blogs/categories/summary")
async def get_blog_categories_summary(db: Session = Depends(get_db)):
    """Return count of published posts per category for category pill navigation."""
    results = (
        db.query(BlogPostDB.category, func.count(BlogPostDB.id))
        .filter(BlogPostDB.is_published == True)
        .group_by(BlogPostDB.category)
        .all()
    )
    total_published = db.query(BlogPostDB).filter(BlogPostDB.is_published == True).count()
    categories = [{"category": cat or "General", "count": count} for cat, count in results]
    return {
        "total": total_published,
        "categories": categories,
    }


@router.get("/blogs/{slug}", response_model=BlogPostDetailResponse)
async def get_blog_by_slug(slug: str, db: Session = Depends(get_db)):
    """Retrieve published blog post by slug, increment view count, and return related posts."""
    post = db.query(BlogPostDB).filter(BlogPostDB.slug == slug).first()

    if not post or not post.is_published:
        raise HTTPException(status_code=404, detail="Blog post not found")

    # Increment views count
    post.views_count = (post.views_count or 0) + 1
    db.commit()
    db.refresh(post)

    # Find up to 3 related posts (in same category or latest published, excluding current post)
    related = (
        db.query(BlogPostDB)
        .filter(
            BlogPostDB.is_published == True,
            BlogPostDB.id != post.id,
            BlogPostDB.category == post.category,
        )
        .order_by(BlogPostDB.created_at.desc())
        .limit(3)
        .all()
    )

    if len(related) < 3:
        needed = 3 - len(related)
        already_ids = [p.id for p in related] + [post.id]
        more_posts = (
            db.query(BlogPostDB)
            .filter(
                BlogPostDB.is_published == True,
                ~BlogPostDB.id.in_(already_ids),
            )
            .order_by(BlogPostDB.created_at.desc())
            .limit(needed)
            .all()
        )
        related.extend(more_posts)

    detail_data = BlogPostDetailResponse.model_validate(post)
    detail_data.related_posts = [BlogPostResponse.model_validate(r) for r in related]
    return detail_data


# =====================================================================
# BLOG AUTHOR AUTHENTICATION
# =====================================================================

@router.post("/blogs/author/login")
@limiter.limit("5/minute")
async def blog_author_login(
    request: Request,
    login_data: BlogAuthorLoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate blog author using system-generated credentials."""
    identifier = login_data.author_id.strip()
    user = db.query(UserDB).filter(
        or_(
            UserDB.email.ilike(identifier),
            UserDB.full_name.ilike(identifier),
        )
    ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid Author ID or Password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role not in ["admin", "blog_author"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Account is not registered with Blog Author privileges.",
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})

    db_refresh_token = RefreshTokenDB(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(db_refresh_token)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_name": user.full_name or "Blog Author",
        "role": user.role,
        "author_id": user.email,
    }


# =====================================================================
# ADMIN / BLOG AUTHOR MANAGEMENT ENDPOINTS (ROLE-GUARDED)
# =====================================================================

@router.get("/admin/blogs", response_model=BlogPostListResponse)
async def admin_get_all_blogs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query("all"),  # all, published, draft
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    author: UserDB = Depends(get_current_blog_author),
):
    """Admin/Author endpoint to list all blogs including drafts."""
    query = db.query(BlogPostDB)

    if status == "published":
        query = query.filter(BlogPostDB.is_published == True)
    elif status == "draft":
        query = query.filter(BlogPostDB.is_published == False)

    if category and category.lower() != "all":
        query = query.filter(BlogPostDB.category == category)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                BlogPostDB.title.ilike(search_term),
                BlogPostDB.summary.ilike(search_term),
                BlogPostDB.slug.ilike(search_term),
            )
        )

    total = query.count()
    total_pages = max(1, math.ceil(total / limit))
    offset = (page - 1) * limit

    posts = query.order_by(BlogPostDB.created_at.desc()).offset(offset).limit(limit).all()

    return BlogPostListResponse(
        posts=posts,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("/admin/blogs", response_model=BlogPostResponse, status_code=201)
async def admin_create_blog(
    post_in: BlogPostCreate,
    db: Session = Depends(get_db),
    author: UserDB = Depends(get_current_blog_author),
):
    """Admin-only endpoint to create a new blog post with automatic slug collision handling."""
    base_slug = slugify(post_in.slug if post_in.slug and post_in.slug.strip() else post_in.title)
    unique_slug = get_unique_slug(db, base_slug)

    # Sanitize content strictly for security
    clean_content = sanitize_blog_html(post_in.content)

    post_data = post_in.model_dump()
    post_data["slug"] = unique_slug
    post_data["content"] = clean_content

    new_post = BlogPostDB(**post_data)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return new_post


@router.get("/admin/blogs/{post_id}", response_model=BlogPostResponse)
async def admin_get_blog_by_id(
    post_id: int,
    db: Session = Depends(get_db),
    author: UserDB = Depends(get_current_blog_author),
):
    """Admin/Author endpoint to view single post details (including drafts)."""
    post = db.query(BlogPostDB).filter(BlogPostDB.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return post


@router.put("/admin/blogs/{post_id}", response_model=BlogPostResponse)
async def admin_update_blog(
    post_id: int,
    post_in: BlogPostUpdate,
    db: Session = Depends(get_db),
    author: UserDB = Depends(get_current_blog_author),
):
    """Admin/Author endpoint to update blog post."""
    post = db.query(BlogPostDB).filter(BlogPostDB.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    update_dict = post_in.model_dump(exclude_unset=True)

    if "title" in update_dict and ("slug" not in update_dict or not update_dict["slug"]):
        # Do not automatically change existing slug unless explicitly requested
        pass
    elif "slug" in update_dict and update_dict["slug"]:
        clean_slug = slugify(update_dict["slug"])
        unique_slug = get_unique_slug(db, clean_slug, exclude_id=post_id)
        update_dict["slug"] = unique_slug

    if "content" in update_dict and update_dict["content"]:
        update_dict["content"] = sanitize_blog_html(update_dict["content"])

    for field, val in update_dict.items():
        setattr(post, field, val)

    db.commit()
    db.refresh(post)
    return post


@router.delete("/admin/blogs/{post_id}")
async def admin_delete_blog(
    post_id: int,
    db: Session = Depends(get_db),
    author: UserDB = Depends(get_current_blog_author),
):
    """Admin/Author endpoint to delete a blog post."""
    post = db.query(BlogPostDB).filter(BlogPostDB.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    db.delete(post)
    db.commit()
    return {"message": "Blog post successfully deleted", "id": post_id}


@router.post("/admin/blogs/{post_id}/toggle-publish")
async def admin_toggle_publish(
    post_id: int,
    db: Session = Depends(get_db),
    author: UserDB = Depends(get_current_blog_author),
):
    """Admin/Author quick toggle between draft and published status."""
    post = db.query(BlogPostDB).filter(BlogPostDB.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    post.is_published = not post.is_published
    db.commit()
    db.refresh(post)

    status_str = "published" if post.is_published else "draft"
    return {
        "id": post.id,
        "is_published": post.is_published,
        "message": f"Post status updated to {status_str}",
    }
