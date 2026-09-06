import re
import math
import secrets
import string
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
from deps import get_current_blog_author, get_current_admin, limiter
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from utils import sanitize_blog_html

router = APIRouter(tags=["Blogs"])


class BlogAuthorLoginRequest(BaseModel):
    author_id: str
    password: str


class BlogAuthorUpdateCredentialsRequest(BaseModel):
    current_password: str
    new_email: Optional[str] = None
    new_password: Optional[str] = None


class BlogRejectionRequest(BaseModel):
    reason: Optional[str] = "Revisions requested by administrator before publication."


class GenerateAuthorRequest(BaseModel):
    author_id: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None


def validate_strong_password(password: str) -> tuple[bool, str]:
    """
    Validate that a password meets strong security requirements:
    - Minimum 8 characters
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one digit (0-9)
    - At least one special symbol (!@#$%^&*()-_=+[]{}|;:,.<>/?)
    """
    if len(password) < 8:
        return False, "New password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "New password must contain at least one uppercase letter (A-Z)."
    if not re.search(r"[a-z]", password):
        return False, "New password must contain at least one lowercase letter (a-z)."
    if not re.search(r"\d", password):
        return False, "New password must contain at least one number (0-9)."
    if not re.search(r"[!@#$%^&*()_=+\[\]{};:'\",.<>/?\\|`~\-]", password):
        return False, "New password must contain at least one special character (!@#$%^&*)."
    return True, ""



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
    query = db.query(BlogPostDB).filter(
        BlogPostDB.is_published == True,
        BlogPostDB.status == "published",
    )

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
        .filter(
            BlogPostDB.is_published == True,
            BlogPostDB.status == "published",
            BlogPostDB.featured == True,
        )
        .order_by(BlogPostDB.created_at.desc())
        .limit(limit)
        .all()
    )

    # Fallback to latest posts if no posts are marked as featured
    if not posts:
        posts = (
            db.query(BlogPostDB)
            .filter(
                BlogPostDB.is_published == True,
                BlogPostDB.status == "published",
            )
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
        .filter(
            BlogPostDB.is_published == True,
            BlogPostDB.status == "published",
        )
        .group_by(BlogPostDB.category)
        .all()
    )
    total_published = (
        db.query(BlogPostDB)
        .filter(
            BlogPostDB.is_published == True,
            BlogPostDB.status == "published",
        )
        .count()
    )
    categories = [{"category": cat or "General", "count": count} for cat, count in results]
    return {
        "total": total_published,
        "categories": categories,
    }


@router.get("/blogs/{slug}", response_model=BlogPostDetailResponse)
async def get_blog_by_slug(slug: str, db: Session = Depends(get_db)):
    """Retrieve published blog post by slug, increment view count, and return related posts."""
    post = db.query(BlogPostDB).filter(BlogPostDB.slug == slug).first()

    if not post or not post.is_published or post.status != "published":
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
            BlogPostDB.status == "published",
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
                BlogPostDB.status == "published",
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


@router.put("/blogs/author/credentials")
@limiter.limit("5/minute")
async def update_blog_author_credentials(
    request: Request,
    body: BlogAuthorUpdateCredentialsRequest,
    current_author: UserDB = Depends(get_current_blog_author),
    db: Session = Depends(get_db),
):
    """Update blog author access credentials (email ID and/or password)."""
    if not verify_password(body.current_password, current_author.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    updated = False

    if body.new_email and body.new_email.strip():
        new_email = body.new_email.strip().lower()
        if "@" not in new_email or "." not in new_email:
            raise HTTPException(status_code=400, detail="Invalid email address format.")

        if new_email != current_author.email:
            existing = db.query(UserDB).filter(
                UserDB.email == new_email,
                UserDB.id != current_author.id,
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="This email address is already in use by another account.",
                )
            current_author.email = new_email
            updated = True

    if body.new_password and body.new_password.strip():
        new_password = body.new_password.strip()
        is_valid, err_msg = validate_strong_password(new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)
        current_author.hashed_password = get_password_hash(new_password)
        updated = True

    if not updated:
        raise HTTPException(
            status_code=400,
            detail="Please provide a new email address or new password to update.",
        )

    db.commit()
    db.refresh(current_author)

    access_token = create_access_token(data={"sub": current_author.email, "role": current_author.role})
    refresh_token = create_refresh_token(data={"sub": current_author.email})

    db_refresh_token = RefreshTokenDB(
        user_id=current_author.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(db_refresh_token)
    db.commit()

    return {
        "message": "Author credentials updated successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_name": current_author.full_name or "Blog Author",
        "role": current_author.role,
        "author_id": current_author.email,
        "email": current_author.email,
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
        query = query.filter(BlogPostDB.is_published == True, BlogPostDB.status == "published")
    elif status in ["pending_approval", "pending"]:
        query = query.filter(BlogPostDB.status == "pending_approval")
    elif status == "draft":
        query = query.filter(BlogPostDB.status == "draft")
    elif status == "rejected":
        query = query.filter(BlogPostDB.status == "rejected")

    if category and category.lower() != "all":
        query = query.filter(BlogPostDB.category == category)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                BlogPostDB.title.ilike(search_term),
                BlogPostDB.summary.ilike(search_term),
                BlogPostDB.slug.ilike(search_term),
                BlogPostDB.author_name.ilike(search_term),
                BlogPostDB.author_id.ilike(search_term),
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
    """Admin/Author endpoint to create a blog post. Authors require admin approval before publication."""
    base_slug = slugify(post_in.slug if post_in.slug and post_in.slug.strip() else post_in.title)
    unique_slug = get_unique_slug(db, base_slug)

    # Sanitize content strictly for security
    clean_content = sanitize_blog_html(post_in.content)

    post_data = post_in.model_dump()
    post_data["slug"] = unique_slug
    post_data["content"] = clean_content

    # Role-based moderation enforcement
    if author.role == "blog_author":
        post_data["author_id"] = author.email
        if post_data.get("is_published") or post_data.get("status") == "pending_approval":
            post_data["is_published"] = False
            post_data["status"] = "pending_approval"
        else:
            post_data["is_published"] = False
            post_data["status"] = "draft"
    else:
        # Admin can publish directly or save as draft
        if post_data.get("is_published"):
            post_data["is_published"] = True
            post_data["status"] = "published"
            post_data["reviewed_by"] = author.email
        else:
            post_data["status"] = post_data.get("status") or "draft"
        if not post_data.get("author_id"):
            post_data["author_id"] = author.email

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
    """Admin/Author endpoint to view single post details (including drafts and pending review)."""
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
    """Admin/Author endpoint to update blog post with role-based moderation checks."""
    post = db.query(BlogPostDB).filter(BlogPostDB.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    update_dict = post_in.model_dump(exclude_unset=True)

    if "title" in update_dict and ("slug" not in update_dict or not update_dict["slug"]):
        pass
    elif "slug" in update_dict and update_dict["slug"]:
        clean_slug = slugify(update_dict["slug"])
        unique_slug = get_unique_slug(db, clean_slug, exclude_id=post_id)
        update_dict["slug"] = unique_slug

    if "content" in update_dict and update_dict["content"]:
        update_dict["content"] = sanitize_blog_html(update_dict["content"])

    # Role-based moderation rules
    if author.role == "blog_author":
        if not post.author_id:
            post.author_id = author.email
        # If author requests publishing or pending status
        if update_dict.get("is_published") is True or update_dict.get("status") == "pending_approval":
            update_dict["is_published"] = False
            update_dict["status"] = "pending_approval"
        elif update_dict.get("is_published") is False:
            update_dict["status"] = "draft"
    else:
        # Admin updating post
        if update_dict.get("is_published") is True:
            update_dict["is_published"] = True
            update_dict["status"] = "published"
            update_dict["rejection_reason"] = None
            update_dict["reviewed_by"] = author.email
        elif update_dict.get("is_published") is False and update_dict.get("status") != "rejected":
            update_dict["status"] = "draft"

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
    """Admin/Author quick toggle. Authors submit for approval; admins publish directly."""
    post = db.query(BlogPostDB).filter(BlogPostDB.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    if author.role == "blog_author":
        if post.status in ["published", "pending_approval"]:
            post.is_published = False
            post.status = "draft"
            msg = "Article reverted to draft."
        else:
            post.is_published = False
            post.status = "pending_approval"
            post.author_id = author.email
            msg = "Article submitted for admin approval."
    else:
        post.is_published = not post.is_published
        post.status = "published" if post.is_published else "draft"
        if post.is_published:
            post.rejection_reason = None
            post.reviewed_by = author.email
        msg = f"Post status updated to {post.status}"

    db.commit()
    db.refresh(post)

    return {
        "id": post.id,
        "status": post.status,
        "is_published": post.is_published,
        "message": msg,
    }


# =====================================================================
# ADMIN MODERATION & AUTHOR MANAGEMENT (ADMIN ONLY)
# =====================================================================

@router.post("/admin/blogs/{post_id}/approve")
async def admin_approve_blog(
    post_id: int,
    db: Session = Depends(get_db),
    admin: UserDB = Depends(get_current_admin),
):
    """Admin-only endpoint to approve a blog post and publish it live."""
    post = db.query(BlogPostDB).filter(BlogPostDB.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    post.status = "published"
    post.is_published = True
    post.rejection_reason = None
    post.reviewed_by = admin.email

    db.commit()
    db.refresh(post)

    return {
        "message": f"Article '{post.title}' approved and published live!",
        "id": post.id,
        "status": post.status,
        "is_published": post.is_published,
    }


@router.post("/admin/blogs/{post_id}/reject")
async def admin_reject_blog(
    post_id: int,
    body: BlogRejectionRequest,
    db: Session = Depends(get_db),
    admin: UserDB = Depends(get_current_admin),
):
    """Admin-only endpoint to reject a blog post with author feedback."""
    post = db.query(BlogPostDB).filter(BlogPostDB.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    post.status = "rejected"
    post.is_published = False
    post.rejection_reason = body.reason or "Needs revisions before publication."
    post.reviewed_by = admin.email

    db.commit()
    db.refresh(post)

    return {
        "message": "Article rejected and returned with feedback.",
        "id": post.id,
        "status": post.status,
        "rejection_reason": post.rejection_reason,
    }


@router.get("/admin/authors")
async def admin_get_authors(
    db: Session = Depends(get_db),
    admin: UserDB = Depends(get_current_admin),
):
    """Admin-only endpoint to list all registered blog authors."""
    authors = (
        db.query(UserDB)
        .filter(UserDB.role == "blog_author")
        .order_by(UserDB.id.desc())
        .all()
    )
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
        }
        for u in authors
    ]


@router.post("/admin/authors/generate")
async def admin_generate_author(
    body: GenerateAuthorRequest,
    db: Session = Depends(get_db),
    admin: UserDB = Depends(get_current_admin),
):
    """Admin-only endpoint to generate a new blog author login with a strong password."""
    plain_password = body.password.strip() if body.password else None
    if not plain_password:
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
        while True:
            cand = "".join(secrets.choice(alphabet) for _ in range(16))
            if (
                any(c.islower() for c in cand)
                and any(c.isupper() for c in cand)
                and any(c.isdigit() for c in cand)
                and any(c in "!@#$%^&*()-_=+" for c in cand)
            ):
                plain_password = cand
                break
    else:
        is_valid, err_msg = validate_strong_password(plain_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

    author_email = (
        body.author_id.strip().lower()
        if body.author_id and body.author_id.strip()
        else f"author_{secrets.token_hex(2)}@tronix365.in"
    )
    name = body.name.strip() if body.name and body.name.strip() else "Tronix365 Technical Writer"

    existing_user = db.query(UserDB).filter(UserDB.email == author_email).first()
    hashed = get_password_hash(plain_password)
    if existing_user:
        existing_user.hashed_password = hashed
        existing_user.role = "blog_author"
        existing_user.is_active = True
        existing_user.full_name = name
        action = "updated"
    else:
        new_user = UserDB(
            email=author_email,
            hashed_password=hashed,
            full_name=name,
            role="blog_author",
            is_active=True,
        )
        db.add(new_user)
        action = "created"

    db.commit()

    return {
        "message": f"Author account successfully {action}.",
        "author_id": author_email,
        "password": plain_password,
        "full_name": name,
        "role": "blog_author",
    }
