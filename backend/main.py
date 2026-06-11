from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Union
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
from database import engine, Base, get_db
from models import (
    Product,
    ProductDB,
    UserDB,
    Order,
    OrderCreate,
    OrderDB,
    OrderItemDB,
    LoginRequest,
    ReviewDB,
    ReviewCreate,
    ReviewResponse,
    ProductCreate,
    ProductUpdate,
    ContactMessageDB,
    WishlistItemDB,
    CartItemDB,
    WishlistCreate,
    WishlistResponse,
    CartItemCreate,
    CartItemUpdate,
    CartItemResponse,
    CartMergeRequest,
    CouponDB,
    CouponCreate,
    CouponResponse,
    BundleDB,
    BundleProductDB,
    BundleResponse,
    BundleCreate,
)
import requests
import hashlib
import os
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File
import shutil
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from email_utils import send_order_confirmation_email
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from utils import sanitize_html, sanitize_description, process_image
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
import redis

# Ensure 'uploads' directory exists
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Tronix365 API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Create tables - Moved to startup for non-blocking import
@app.on_event("startup")
async def startup():
    # Try to initialize Redis, fallback to InMemory if it fails
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        from fastapi_cache.backends.redis import RedisBackend

        redis_client = redis.from_url(redis_url, encoding="utf8", decode_responses=True)
        # Check if redis is actually reachable
        redis_client.ping()
        FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache")
        print(f"Redis cache initialized with URL: {redis_url}")
    except Exception as e:
        print(f"Redis connection failed, falling back to InMemoryBackend: {e}")
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")

    try:
        # Run in a thread to prevent blocking the event loop if DB is slow
        from starlette.concurrency import run_in_threadpool

        await run_in_threadpool(Base.metadata.create_all, bind=engine)
        print("Database tables verified/created.")
    except Exception as e:
        print(f"Database connection error during startup: {e}")


# CORS Setup - Hardcoded for Production Safety & Dynamic Config
env_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
origins = [
    "https://www.tronix365.in",
    "https://tronix365.in",
    "https://www.tronix.in",
    "https://tronix.in",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
] + env_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Removed custom validation_exception_handler because it breaks CORS on 422 errors

@app.get("/")
async def read_root():
    return {"message": "Welcome to Tronix365 API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/products", response_model=List[Product])
# @cache(expire=3600, namespace="products")
async def get_products(
    response: Response,
    skip: int = 0,
    limit: int = 20,
    category: str = None,
    min_price: float = None,
    max_price: float = None,
    sort_by: str = None,
    search: str = None,
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    print(f"DEBUG: get_products skip={skip}, limit={limit}, sort_by={sort_by}")
    query = db.query(ProductDB)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (ProductDB.title.ilike(search_term))
            | (ProductDB.description.ilike(search_term))
            | (ProductDB.category.ilike(search_term))
        )

    if category and category != "All":
        query = query.filter(ProductDB.category == category)

    if min_price is not None:
        query = query.filter(ProductDB.price >= min_price)

    if max_price is not None:
        query = query.filter(ProductDB.price <= max_price)

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


@app.get("/products/search", response_model=List[Product])
@cache(expire=300, namespace="products")
async def search_products(q: str = "", db: Session = Depends(get_db)):
    """
    Search products by title, description, or category with fuzzy matching.
    """
    if not q:
        return []

    # Split query into words for more flexible searching
    words = q.strip().split()
    if not words:
        return []

    # Build filters: Each word must appear in AT LEAST one of the fields
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

    # Combine all word filters with AND (each word must match something)
    products = db.query(ProductDB).filter(and_(*word_filters)).limit(15).all()

    return products


@app.get("/products/recommendations/{product_id}", response_model=List[Product])
@cache(expire=3600, namespace="products")
async def get_recommendations(product_id: int, db: Session = Depends(get_db)):
    """
    Get related products based on category.
    """
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Same category, excluding current product
    recommendations = (
        db.query(ProductDB)
        .filter(ProductDB.category == product.category, ProductDB.id != product_id)
        .limit(4)
        .all()
    )

    # Fill with top rated if not enough
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


@app.get("/products/{product_id}", response_model=Product)
@cache(expire=3600, namespace="products")
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.get("/products/slug/{slug}", response_model=Product)
@cache(expire=3600, namespace="products")
async def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    import re
    def make_slug(title: str) -> str:
        t = title.lower()
        t = re.sub(r'[^a-z0-9\s-]', '', t)
        t = re.sub(r'[\s-]+', '-', t)
        return t.strip('-')

    products = db.query(ProductDB).all()
    for p in products:
        if make_slug(p.title) == slug.lower().strip('-'):
            return p

    raise HTTPException(status_code=404, detail="Product not found")



@app.post("/products", response_model=Product, status_code=201)
async def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    new_product = ProductDB(**product.dict())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    await FastAPICache.clear(
        namespace="products"
    )  # Clear cache to ensure immediate visibility
    return new_product


@app.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_id: int, product: ProductUpdate, db: Session = Depends(get_db)
):
    db_product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    product_data = product.dict(exclude_unset=True)
    for key, value in product_data.items():
        setattr(db_product, key, value)

    db.commit()
    db.refresh(db_product)
    await FastAPICache.clear(
        namespace="products"
    )  # Clear cache so edited products update globally
    return db_product


@app.delete("/products/{product_id}", status_code=204)
async def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(db_product)
    db.commit()
    await FastAPICache.clear(namespace="products")  # Clear cache when product deleted
    return None


from email_utils import send_order_confirmation_email


@app.post("/orders", status_code=201)
async def create_order(
    order: OrderCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    # Create Order
    new_order = OrderDB(
        customer_email=order.customer_email,
        total_amount=order.total_amount,
        status="pending",  # Requires admin approval
    )

    # Process Items
    for item in order.items:
        # Identify Product
        product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=400, detail=f"Product ID {item.product_id} is invalid."
            )

        # Enforce Stock Check Globally
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.title}. Only {product.stock} available.",
            )

        # Determine price (sale price > mrp > 0)
        price = (
            product.sale_price
            if product.sale_price
            else (product.price if product.price else 0.0)
        )

        # Create Order Item linked to Order
        order_item = OrderItemDB(
            product_id=item.product_id, quantity=item.quantity, price_at_purchase=price
        )
        new_order.items.append(order_item)

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    print(f"Order saved as pending: {new_order.id}")
    return {
        "message": "Order placed successfully. Pending admin approval.",
        "order_id": new_order.id,
        "status": "pending",
    }

class OrderStatusUpdate(BaseModel):
    status: str

@app.put("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: int, 
    status_update: OrderStatusUpdate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    valid_statuses = ["pending", "confirmed", "shipped", "delivered", "deleted"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    # If rejecting (deleted), restore stock only if the order was previously confirmed, shipped, or delivered
    if status_update.status == "deleted" and order.status in ["confirmed", "shipped", "delivered"]:
        for item in order.items:
            product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
            if product:
                product.stock += item.quantity

    # If accepting (confirmed) from pending, send email, increment coupon usage, and decrement stock
    if status_update.status == "confirmed" and order.status == "pending":
        background_tasks.add_task(send_order_confirmation_email, order)
        # Decrement Stock
        if order.items:
            for item in order.items:
                product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
                if product:
                    product.stock -= item.quantity
                    if product.stock < 0:
                        product.stock = 0  # Safety check
        if order.coupon_code:
            coupon = db.query(CouponDB).filter(CouponDB.code == order.coupon_code).first()
            if coupon:
                coupon.used_count += 1

    order.status = status_update.status
    db.commit()
    db.refresh(order)

    return {"message": "Order status updated successfully", "status": order.status}


# Coupon System Endpoints
@app.post("/admin/coupons", response_model=CouponResponse, status_code=201)
async def create_coupon(coupon: CouponCreate, db: Session = Depends(get_db)):
    # Check if coupon code exists
    existing = db.query(CouponDB).filter(CouponDB.code == coupon.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    new_coupon = CouponDB(**coupon.dict())
    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)
    return new_coupon


@app.get("/admin/coupons", response_model=List[CouponResponse])
async def list_coupons(db: Session = Depends(get_db)):
    return db.query(CouponDB).all()


@app.put("/admin/coupons/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: int, update_data: CouponUpdate, db: Session = Depends(get_db)
):
    coupon = db.query(CouponDB).filter(CouponDB.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(coupon, key, value)

    db.commit()
    db.refresh(coupon)
    return coupon


@app.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: int, db: Session = Depends(get_db)):
    coupon = db.query(CouponDB).filter(CouponDB.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted successfully"}


@app.post("/apply-coupon")
async def apply_coupon(code: str, cart_total: float, db: Session = Depends(get_db)):
    coupon = (
        db.query(CouponDB)
        .filter(CouponDB.code == code, CouponDB.is_active == True)
        .first()
    )
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid or inactive coupon code")

    # Fix for offset-aware vs naive comparison
    now = (
        datetime.now(coupon.expiry_date.tzinfo)
        if coupon.expiry_date.tzinfo
        else datetime.utcnow()
    )
    if now > coupon.expiry_date:
        raise HTTPException(status_code=400, detail="Coupon has expired")

    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    if cart_total < coupon.min_purchase:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum purchase of {coupon.min_purchase} required",
        )

    discount = 0.0
    if coupon.discount_type == "percentage":
        discount = cart_total * (coupon.discount_value / 100)
    else:
        discount = coupon.discount_value

    return {
        "code": coupon.code,
        "discount_amount": round(discount, 2),
        "new_total": round(max(0, cart_total - discount), 2),
    }


# Bundle System Endpoints
@app.post("/admin/bundles", response_model=BundleResponse, status_code=201)
async def create_bundle(bundle_data: BundleCreate, db: Session = Depends(get_db)):
    new_bundle = BundleDB(
        name=bundle_data.name,
        description=bundle_data.description,
        original_price=bundle_data.original_price,
        bundle_price=bundle_data.bundle_price,
    )
    db.add(new_bundle)
    db.commit()
    db.refresh(new_bundle)

    for p_id in bundle_data.product_ids:
        bp = BundleProductDB(bundle_id=new_bundle.id, product_id=p_id)
        db.add(bp)

    db.commit()
    db.refresh(new_bundle)
    # Using joinedload to ensure products are returned
    return (
        db.query(BundleDB)
        .options(joinedload(BundleDB.products).joinedload(BundleProductDB.product))
        .filter(BundleDB.id == new_bundle.id)
        .first()
    )


@app.put("/admin/bundles/{bundle_id}", response_model=BundleResponse)
async def update_bundle(
    bundle_id: int, update_data: BundleUpdate, db: Session = Depends(get_db)
):
    bundle = db.query(BundleDB).filter(BundleDB.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(bundle, key, value)

    db.commit()
    db.refresh(bundle)
    return (
        db.query(BundleDB)
        .options(joinedload(BundleDB.products).joinedload(BundleProductDB.product))
        .filter(BundleDB.id == bundle_id)
        .first()
    )


@app.delete("/admin/bundles/{bundle_id}")
async def delete_bundle(bundle_id: int, db: Session = Depends(get_db)):
    bundle = db.query(BundleDB).filter(BundleDB.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    # Safely nullify foreign keys in carts and order history
    db.query(CartItemDB).filter(CartItemDB.bundle_id == bundle_id).update(
        {"bundle_id": None}
    )
    db.query(OrderItemDB).filter(OrderItemDB.bundle_id == bundle_id).update(
        {"bundle_id": None}
    )
    db.commit()

    db.delete(bundle)
    db.commit()
    return {"message": "Bundle deleted successfully"}


@app.get("/bundles", response_model=List[BundleResponse])
async def get_bundles(db: Session = Depends(get_db)):
    return (
        db.query(BundleDB)
        .filter(BundleDB.is_active == True)
        .options(joinedload(BundleDB.products).joinedload(BundleProductDB.product))
        .all()
    )


@app.get("/products/{product_id}/bundles", response_model=List[BundleResponse])
async def get_product_bundles(product_id: int, db: Session = Depends(get_db)):
    """Fetch bundles that include this specific product."""
    bundles = (
        db.query(BundleDB)
        .join(BundleProductDB)
        .filter(BundleProductDB.product_id == product_id, BundleDB.is_active == True)
        .options(joinedload(BundleDB.products).joinedload(BundleProductDB.product))
        .all()
    )
    return bundles


@app.get("/orders", response_model=List[Order])
async def get_orders(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    orders = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return orders


from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from datetime import timedelta
from models import UserDB, UserCreate, Token, UserLogin, UserResponse, UserUpdate

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# Dependency to get current user
async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    from jose import JWTError, jwt
    from auth import SECRET_KEY, ALGORITHM
    from models import TokenData

    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = db.query(UserDB).filter(UserDB.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


@app.post("/products/{product_id}/reviews", response_model=ReviewResponse)
async def create_review(
    product_id: int,
    review: ReviewCreate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify product exists
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


@app.get("/products/{product_id}/reviews", response_model=List[ReviewResponse])
async def get_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = db.query(ReviewDB).filter(ReviewDB.product_id == product_id).all()
    return reviews


class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    message: str


from email_utils import send_contact_form_notification
from models import ContactMessageDB

from fastapi import BackgroundTasks


@app.post("/contact")
@limiter.limit("5/minute")
async def send_contact_email(
    request: Request,
    contact: ContactMessage,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # 1. Save to Database
    try:
        new_msg = ContactMessageDB(
            name=contact.name, email=contact.email, message=contact.message
        )
        db.add(new_msg)
        db.commit()
    except Exception as e:
        print(f"Error saving contact message to DB: {e}")

    # 2. Try sending the email in the background to prevent UI hanging
    background_tasks.add_task(
        send_contact_form_notification, contact.name, contact.email, contact.message
    )

    # 3. Always return success to the UI instantly (since it's in the DB)
    return {"message": "Message sent successfully, queued for delivery"}


@app.post("/signup", response_model=Token)
@limiter.limit("5/minute")
async def signup(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = db.query(UserDB).filter(UserDB.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = get_password_hash(user.password)
        new_user = UserDB(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            role="user",  # Default role
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Auto-login after signup
        access_token = create_access_token(
            data={"sub": new_user.email, "role": new_user.role}
        )
        refresh_token = create_refresh_token(data={"sub": new_user.email})

        # Store Refresh Token in DB
        from models import RefreshTokenDB
        from auth import REFRESH_TOKEN_EXPIRE_DAYS

        db_refresh_token = RefreshTokenDB(
            user_id=new_user.id,
            token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(db_refresh_token)
        db.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user_name": new_user.full_name,
            "role": new_user.role,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Signup Error: {str(e)}")


@app.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(UserDB).filter(UserDB.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin credentials not allowed here. Please use Admin Login.",
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})

    # Store Refresh Token in DB
    from models import RefreshTokenDB
    from auth import REFRESH_TOKEN_EXPIRE_DAYS

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
        "user_name": user.full_name,
        "role": user.role,
    }


@app.post("/admin/login", response_model=Token)
@limiter.limit("5/minute")
async def admin_login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(UserDB).filter(UserDB.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin credentials required.",
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})

    # Store Refresh Token in DB
    from models import RefreshTokenDB
    from auth import REFRESH_TOKEN_EXPIRE_DAYS

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
        "user_name": user.full_name,
        "role": user.role,
    }


class GoogleLoginRequest(BaseModel):
    credential: str


@app.post("/auth/google", response_model=Token)
async def google_auth(google_req: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        # 1. Verify the ID Token from Google
        CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        if not CLIENT_ID:
            raise HTTPException(status_code=500, detail="Google Client ID not configured")
            
        idinfo = id_token.verify_oauth2_token(
            google_req.credential, google_requests.Request(), CLIENT_ID
        )

        # 2. Extract user info
        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])
        picture = idinfo.get('picture')

        # 3. Check if user exists, if not create
        user = db.query(UserDB).filter(UserDB.email == email).first()
        if not user:
            # Create user without password (OAuth user)
            user = UserDB(
                email=email,
                full_name=name,
                profile_picture=picture,
                role="user",
                hashed_password="OAUTH_USER_NO_PASSWORD"  # Sentinel value
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update profile picture if it changed
            if picture and not user.profile_picture:
                user.profile_picture = picture
                db.commit()

        # 4. Issue local tokens
        access_token = create_access_token(data={"sub": user.email, "role": user.role})
        refresh_token = create_refresh_token(data={"sub": user.email})

        # Store Refresh Token
        from models import RefreshTokenDB
        from auth import REFRESH_TOKEN_EXPIRE_DAYS
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
            "user_name": user.full_name,
            "role": user.role,
        }

    except ValueError:
        # Invalid token
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        print(f"Google Auth Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during Google Auth")


@app.post("/refresh", response_model=Token)
async def refresh_token_endpoint(refresh_token: str, db: Session = Depends(get_db)):
    from jose import JWTError, jwt
    from auth import SECRET_KEY, ALGORITHM, create_access_token
    from models import RefreshTokenDB, UserDB

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email: str = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Check database for this token
    db_token = (
        db.query(RefreshTokenDB).filter(RefreshTokenDB.token == refresh_token).first()
    )
    if not db_token or db_token.expires_at < datetime.utcnow():
        if db_token:
            db.delete(db_token)
            db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

    user = db.query(UserDB).filter(UserDB.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = create_access_token(data={"sub": user.email, "role": user.role})

    return {
        "access_token": new_access_token,
        "refresh_token": refresh_token,  # Send same refresh token back or rotate it
        "token_type": "bearer",
        "user_name": user.full_name,
        "role": user.role,
    }


@app.post("/logout")
async def logout(refresh_token: str, db: Session = Depends(get_db)):
    from models import RefreshTokenDB

    db_token = (
        db.query(RefreshTokenDB).filter(RefreshTokenDB.token == refresh_token).first()
    )
    if db_token:
        db.delete(db_token)
        db.commit()
    return {"message": "Logged out successfully"}


@app.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: UserDB = Depends(get_current_user)):
    return current_user


@app.put("/profile", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name

    if user_update.email is not None and user_update.email != current_user.email:
        # Check if email is already taken
        existing_user = (
            db.query(UserDB).filter(UserDB.email == user_update.email).first()
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_update.email

    if user_update.password is not None and user_update.password.strip() != "":
        from auth import get_password_hash

        current_user.hashed_password = get_password_hash(user_update.password)

    if user_update.profile_picture is not None:
        current_user.profile_picture = user_update.profile_picture

    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/debug-orders")
async def debug_orders(db: Session = Depends(get_db)):
    orders = db.query(OrderDB).order_by(OrderDB.id.desc()).limit(3).all()
    users = db.query(UserDB).order_by(UserDB.id.desc()).limit(3).all()
    return {
        "recent_orders": [
            {"id": o.id, "email": o.customer_email, "status": o.status} for o in orders
        ],
        "recent_users": [{"id": u.id, "email": u.email} for u in users],
    }


@app.get("/orders/user", response_model=List[Order])
async def get_user_orders(
    skip: int = 0,
    limit: int = 20,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Fetch orders based on customer_email matching the logged-in user
    orders = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
        .filter(OrderDB.customer_email == current_user.email)
        .order_by(OrderDB.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return orders


@app.get("/orders/{order_id}", response_model=Order)
async def get_order_by_id(
    order_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Fetch specific order
    order = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
        .filter(OrderDB.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Security: Ensure only the order creator (or an admin) can view it
    if order.customer_email != current_user.email and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this order")

    return order


@app.get("/orders/transaction/{txnid}", response_model=Order)
async def get_order_by_txnid(
    txnid: str,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Fetch specific order by transaction ID
    order = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
        .filter(OrderDB.txnid == txnid)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Security: Ensure only the order creator (or an admin) can view it
    if order.customer_email != current_user.email and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this order")

    return order



# Wishlist Endpoints
@app.get("/wishlist", response_model=List[WishlistResponse])
async def get_wishlist(
    current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(WishlistItemDB)
        .options(joinedload(WishlistItemDB.product))
        .filter(WishlistItemDB.user_id == current_user.id)
        .all()
    )


@app.post("/wishlist", response_model=WishlistResponse)
async def add_to_wishlist(
    wishlist: WishlistCreate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if already exists
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


@app.delete("/wishlist/{product_id}")
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


# Cart Endpoints
@app.get("/cart", response_model=List[CartItemResponse])
async def get_cart(
    current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(CartItemDB)
        .options(joinedload(CartItemDB.product), joinedload(CartItemDB.bundle))
        .filter(CartItemDB.user_id == current_user.id)
        .all()
    )


@app.post("/cart", response_model=CartItemResponse)
async def add_to_cart(
    cart_item: CartItemCreate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if already in cart
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
        db.commit()
        db.refresh(existing)
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
    return (
        db.query(CartItemDB)
        .options(joinedload(CartItemDB.product))
        .filter(CartItemDB.id == new_item.id)
        .first()
    )


@app.put("/cart/{item_id}", response_model=CartItemResponse)
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
        raise HTTPException(status_code=404, detail="Cart item not found")

    if item_update.quantity is not None:
        db_item.quantity = item_update.quantity
    if item_update.selected is not None:
        db_item.selected = item_update.selected

    db_item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete("/cart/{item_id}")
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
        db.delete(item)
        db.commit()
    return {"message": "Removed from cart"}


@app.post("/cart/merge")
async def merge_cart(
    merge_request: CartMergeRequest,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Merge guest cart items into the user's permanent cart."""
    for item in merge_request.items:
        existing = (
            db.query(CartItemDB)
            .filter(
                CartItemDB.user_id == current_user.id,
                CartItemDB.product_id == item.product_id,
            )
            .first()
        )

        if existing:
            # For merge, take the larger quantity or sum? Let's sum but cap at stock later
            existing.quantity += item.quantity
        else:
            new_item = CartItemDB(
                user_id=current_user.id,
                product_id=item.product_id,
                quantity=item.quantity,
                selected=item.selected,
            )
            db.add(new_item)

    db.commit()
    return {"message": "Cart merged successfully"}


@app.post("/cart/bundle/{bundle_id}")
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

    for bp in bundle.products:
        # Check if already in cart (without a bundle_id or with a different one)
        # For simplicity, we always add bundle items as new entries or update existing if same bundle
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


# Trigger reload for env update

# Payment Endpoints
from payu_utils import generate_payu_hash, verify_payu_hash
from fastapi import Form, Request
from fastapi.responses import RedirectResponse


class PaymentItem(BaseModel):
    product_id: int
    quantity: int
    bundle_id: int | None = None


class PaymentInitiate(BaseModel):
    amount: float
    firstname: str
    email: EmailStr
    productinfo: str
    items: List[PaymentItem]  # List of items
    phone: str
    address_line: str
    city: str
    state: str
    pincode: str
    coupon_code: str | None = None
    discount_amount: float = 0.0
    bypass: bool = False


@app.post("/payment/initiate")
async def initiate_payment(payment: PaymentInitiate, db: Session = Depends(get_db)):
    # 1. Validate Stock
    items_for_order = []
    for item in payment.items:
        product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404, detail=f"Product {item.product_id} not found"
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.title}. Only {product.stock} left.",
            )

        # Create OrderItemDB instance
        order_item = OrderItemDB(
            product_id=item.product_id,
            bundle_id=item.bundle_id,
            quantity=item.quantity,
            price_at_purchase=(
                product.sale_price if product.sale_price else product.price
            ),
        )
        items_for_order.append(order_item)

    key = os.getenv("PAYU_KEY")
    salt = os.getenv("PAYU_SALT")
    txnid = f"TXN{int(payment.amount)}{os.urandom(4).hex()}"  # Unique ID

    # Create Order in DB
    status = "confirmed" if payment.bypass else "pending"
    new_order = OrderDB(
        customer_email=payment.email,
        total_amount=payment.amount,
        status=status,
        items=items_for_order,  # Save actual items
        txnid=txnid,
        full_name=payment.firstname,
        phone=payment.phone,
        address_line=payment.address_line,
        city=payment.city,
        state=payment.state,
        pincode=payment.pincode,
        coupon_code=payment.coupon_code,
        discount_amount=payment.discount_amount,
    )
    db.add(new_order)

    # If bypassed, decrement stock and increment coupon usage count immediately
    if payment.bypass:
        for item in items_for_order:
            product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
            if product:
                product.stock -= item.quantity
                if product.stock < 0:
                    product.stock = 0  # Safety check
        if payment.coupon_code:
            coupon = db.query(CouponDB).filter(CouponDB.code == payment.coupon_code).first()
            if coupon:
                coupon.used_count += 1
    db.commit()
    db.refresh(new_order)

    # Clear Cart for this user immediately only if bypassed (as payment is successful instantly)
    if payment.bypass:
        user_obj = db.query(UserDB).filter(UserDB.email == payment.email).first()
        if user_obj:
            db.query(CartItemDB).filter(CartItemDB.user_id == user_obj.id, CartItemDB.selected == True).delete()
            db.commit()


    payu_env = os.getenv("PAYU_ENV", "MOCK").upper()
    if payu_env == "PROD":
        action_url = "https://secure.payu.in/_payment"
    elif payu_env == "TEST":
        action_url = "https://test.payu.in/_payment"
    else:
        action_url = (
            f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/mock-process"
        )

    # Strict formatting to avoid float precision hash mismatch
    amount_str = f"{payment.amount:.2f}"

    hash_value = generate_payu_hash(
        key,
        txnid,
        amount_str,
        payment.productinfo,
        payment.firstname,
        payment.email,
        salt,
    )

    return {
        "key": key,
        "txnid": txnid,
        "amount": amount_str,
        "productinfo": payment.productinfo,
        "firstname": payment.firstname,
        "email": payment.email,
        "phone": payment.phone,
        "surl": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/callback",  # Success URL
        "furl": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/callback",  # Failure URL
        "hash": hash_value,
        "action": action_url,
    }


@app.post("/payment/retry/{order_id}")
async def retry_payment(
    order_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Fetch the order with items loaded
    order = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
        .filter(OrderDB.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Security check
    if order.customer_email != current_user.email and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this order")

    # Check if order is already paid/confirmed
    if order.status in ["confirmed", "shipped", "delivered"]:
        raise HTTPException(status_code=400, detail="Order is already paid/confirmed")

    # Validate stock of items
    for item in order.items:
        product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.title}. Only {product.stock} left."
            )

    # Generate new transaction ID
    txnid = f"TXN{int(order.total_amount)}{os.urandom(4).hex()}"
    order.txnid = txnid
    # Reset status to pending when retrying
    order.status = "pending"
    db.commit()
    db.refresh(order)

    key = os.getenv("PAYU_KEY")
    salt = os.getenv("PAYU_SALT")

    payu_env = os.getenv("PAYU_ENV", "MOCK").upper()
    if payu_env == "PROD":
        action_url = "https://secure.payu.in/_payment"
    elif payu_env == "TEST":
        action_url = "https://test.payu.in/_payment"
    else:
        action_url = (
            f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/mock-process"
        )

    # Strict formatting to avoid float precision hash mismatch
    amount_str = f"{order.total_amount:.2f}"
    productinfo = f"Order for {len(order.items)} items"

    hash_value = generate_payu_hash(
        key,
        txnid,
        amount_str,
        productinfo,
        order.full_name or "Customer",
        order.customer_email,
        salt,
    )

    return {
        "key": key,
        "txnid": txnid,
        "amount": amount_str,
        "productinfo": productinfo,
        "firstname": order.full_name or "Customer",
        "email": order.customer_email,
        "phone": order.phone or "",
        "surl": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/callback",  # Success URL
        "furl": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/payment/callback",  # Failure URL
        "hash": hash_value,
        "action": action_url,
    }



@app.post("/payment/mock-process")
async def mock_payment_process(
    key: str = Form(...),
    txnid: str = Form(...),
    amount: str = Form(...),
    productinfo: str = Form(...),
    firstname: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    surl: str = Form(...),
    furl: str = Form(...),
    hash: str = Form(...),
):
    # Simulate PayU processing time
    import time

    # time.sleep(2)

    # Randomly fail? No, let's default to success for now, or add a magic amount to fail
    status = "success"
    if firstname.lower() == "failure":
        status = "failure"

    salt = os.getenv("PAYU_SALT")

    # Calculate response hash
    # Sequence: salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
    hash_string = f"{salt}|{status}|||||||||||{email}|{firstname}|{productinfo}|{amount}|{txnid}|{key}"
    response_hash = hashlib.sha512(hash_string.encode("utf-8")).hexdigest()

    # Redirect to callback
    # We need to POST to callback, but since this is a browser redirect simulation,
    # we can't easily do a POST redirect from here without a form.
    # So we will return a self-submitting form, just like PayU does.

    html_content = f"""
    <html>
        <head><title>Processing Payment...</title></head>
        <body onload="document.forms[0].submit()">
            <form action="{surl}" method="post">
                <input type="hidden" name="status" value="{status}" />
                <input type="hidden" name="firstname" value="{firstname}" />
                <input type="hidden" name="amount" value="{amount}" />
                <input type="hidden" name="txnid" value="{txnid}" />
                <input type="hidden" name="hash" value="{response_hash}" />
                <input type="hidden" name="productinfo" value="{productinfo}" />
                <input type="hidden" name="email" value="{email}" />
                <input type="hidden" name="key" value="{key}" />
            </form>
        </body>
    </html>
    """
    from fastapi.responses import HTMLResponse

    return HTMLResponse(content=html_content, status_code=200)


@app.post("/payment/callback")
async def payment_callback(
    background_tasks: BackgroundTasks,
    status: str = Form(...),
    firstname: str = Form(...),
    amount: str = Form(...),
    txnid: str = Form(...),
    hash: str = Form(...),
    productinfo: str = Form(...),
    email: str = Form(...),
    error: str = Form(None),
    db: Session = Depends(get_db),
):
    # Verify Signature
    key = os.getenv("PAYU_KEY")
    salt = os.getenv("PAYU_SALT")

    if not verify_payu_hash(
        salt, status, "", email, firstname, productinfo, amount, txnid, key, hash
    ):
        print(f"Hash verification failed for {txnid}")
        # Mark order as tampered or failed
        order = db.query(OrderDB).filter(OrderDB.txnid == txnid).first()
        if order:
            order.status = "tampered"
            db.commit()
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        if ("tronix365.in" in frontend_url or "tronix.in" in frontend_url) and "/e-commerse" not in frontend_url:
            frontend_url = f"{frontend_url}/e-commerse"

        return RedirectResponse(
            url=f"{frontend_url}/payment/failure?txnid={txnid}&reason=tampered",
            status_code=303,
        )

    # Log the status
    print(f"Payment Callback: {status} for {txnid}")

    # Update Order Status
    order = db.query(OrderDB).filter(OrderDB.txnid == txnid).first()
    if order:
        if status == "success":
            # Idempotency check: Only deduct stock if not already confirmed
            if order.status != "confirmed":
                order.status = "confirmed"
                # Decrement Stock
                if order.items:
                    for item in order.items:
                        product = (
                            db.query(ProductDB)
                            .filter(ProductDB.id == item.product_id)
                            .first()
                        )
                        if product:
                            product.stock -= item.quantity
                            if product.stock < 0:
                                product.stock = 0  # Safety check
                # Increment coupon usage count if coupon was used
                if order.coupon_code:
                    coupon = db.query(CouponDB).filter(CouponDB.code == order.coupon_code).first()
                    if coupon:
                        coupon.used_count += 1
                db.commit()  # Commit status, stock, and coupon updates
                db.refresh(order)

                # Clear Cart for this user on successful payment
                user_obj = db.query(UserDB).filter(UserDB.email == order.customer_email).first()
                if user_obj:
                    db.query(CartItemDB).filter(CartItemDB.user_id == user_obj.id, CartItemDB.selected == True).delete()
                    db.commit()

                # Payment succeeds and order is confirmed. Send HTML invoice!
                background_tasks.add_task(send_order_confirmation_email, order)
        else:
            order.status = "failed"
            db.commit()

    # If the app is in a subdirectory but FRONTEND_URL is just the root, we append it.
    # For Tronix365 or Tronix production, it's under /e-commerse
    if ("tronix365.in" in frontend_url or "tronix.in" in frontend_url) and "/e-commerse" not in frontend_url:
        frontend_url = f"{frontend_url}/e-commerse"

    # Redirect to Frontend
    if status == "success":
        return RedirectResponse(
            url=f"{frontend_url}/payment/success?txnid={txnid}", status_code=303
        )
    else:
        return RedirectResponse(
            url=f"{frontend_url}/payment/failure?txnid={txnid}", status_code=303
        )


@app.get("/admin/stats")
@cache(expire=3600)
async def get_admin_stats(db: Session = Depends(get_db)):
    total_orders = db.query(OrderDB).count()
    total_revenue = db.query(func.sum(OrderDB.total_amount)).scalar() or 0.0
    total_products = db.query(ProductDB).count()
    total_users = db.query(UserDB).count()

    # Calculate 30-day Revenue Growth
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    current_revenue = (
        db.query(func.sum(OrderDB.total_amount))
        .filter(OrderDB.created_at >= thirty_days_ago)
        .scalar()
        or 0.0
    )
    previous_revenue = (
        db.query(func.sum(OrderDB.total_amount))
        .filter(
            OrderDB.created_at >= sixty_days_ago, OrderDB.created_at < thirty_days_ago
        )
        .scalar()
        or 0.0
    )

    if previous_revenue == 0:
        growth = 100.0 if current_revenue > 0 else 0.0
    else:
        growth = ((current_revenue - previous_revenue) / previous_revenue) * 100.0

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_products": total_products,
        "active_users": total_users,
        "growth": round(growth, 1),
    }


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        # Create a unique filename
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.urandom(4).hex()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Optimize image and convert to WebP
        optimized_path = process_image(file_path)
        final_filename = os.path.basename(optimized_path)

        # Return a relative URL instead of absolute
        return {"url": f"/uploads/{final_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
