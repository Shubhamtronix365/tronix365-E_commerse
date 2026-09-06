import os
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
import redis

from database import engine, Base, get_db
from models import ProductDB
from auto_migrate import auto_migrate
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

# Initialize default InMemory cache immediately so cached routes work reliably across testing and runtime
FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")

# Shared dependencies and rate limiter
from deps import limiter, get_current_user, get_current_admin, oauth2_scheme

# Import modular routers
from routes import (
    auth_routes,
    category_routes,
    product_routes,
    order_routes,
    payment_routes,
    tower_order_routes,
    cart_routes,
    wishlist_routes,
    coupon_routes,
    bundle_routes,
    review_routes,
    address_routes,
    admin_routes,
    upload_routes,
    bom_routes,
)

# Ensure upload directory exists
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app = FastAPI(title="Tronix365 API", version="1.2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"GLOBAL EXCEPTION: {exc}")
    traceback.print_exc()

    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers=headers,
    )


@app.on_event("startup")
async def startup():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        from fastapi_cache.backends.redis import RedisBackend

        redis_client = redis.from_url(redis_url, encoding="utf8", decode_responses=True)
        redis_client.ping()
        FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache")
        print(f"Redis cache initialized with URL: {redis_url}")
    except Exception as e:
        print(f"Redis connection failed, falling back to InMemoryBackend: {e}")
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")

    try:
        await run_in_threadpool(Base.metadata.create_all, bind=engine)
        await run_in_threadpool(auto_migrate)
        print("Database tables & schema columns verified/created.")

        def _sync_prices():
            with Session(engine) as session:
                prods = session.query(ProductDB).all()
                dirty = False
                for p in prods:
                    if p.price is not None and p.sale_price is not None and p.sale_price != p.price:
                        p.sale_price = p.price
                        dirty = True
                if dirty:
                    session.commit()
                    print("Synced legacy sale_prices to product.price in DB.")

        await run_in_threadpool(_sync_prices)
    except Exception as e:
        print(f"Database connection error during startup: {e}")


# CORS Configuration
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

# Static file mounts
if not os.path.exists("email_assets"):
    os.makedirs("email_assets")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/email-assets", StaticFiles(directory="email_assets"), name="email_assets")

# Base endpoints
@app.get("/")
async def read_root():
    return {"message": "Welcome to Tronix365 API", "status": "running"}


@app.get("/health", status_code=200)
async def health_check():
    return {"status": "ok"}


# Register all modular APIRouters
app.include_router(auth_routes.router)
app.include_router(category_routes.router)
app.include_router(product_routes.router)
app.include_router(order_routes.router)
app.include_router(payment_routes.router)
app.include_router(tower_order_routes.router)
app.include_router(cart_routes.router)
app.include_router(wishlist_routes.router)
app.include_router(coupon_routes.router)
app.include_router(bundle_routes.router)
app.include_router(review_routes.router)
app.include_router(address_routes.router)
app.include_router(admin_routes.router)
app.include_router(upload_routes.router)
app.include_router(bom_routes.router)
