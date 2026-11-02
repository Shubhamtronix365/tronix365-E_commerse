import os
import time
import secrets
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
import redis

from database import engine, Base, get_db
from models import ProductDB, UploadedMediaDB
from auto_migrate import auto_migrate
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

from logging_config import (
    configure_logging,
    get_logger,
    request_id_ctx,
    client_ip_ctx,
    user_id_ctx,
)

# Initialize centralized logging immediately at application startup
configure_logging()
logger = get_logger("system")


class RequestObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Middleware that instruments every incoming HTTP request:
    - Extracts or generates correlation X-Request-ID.
    - Sets context variables (request_id_ctx, client_ip_ctx).
    - Logs structured API_REQUEST_RECEIVED and API_RESPONSE_COMPLETED events.
    - Injects X-Request-ID into response headers for end-to-end frontend/backend traceability.
    """

    async def dispatch(self, request: Request, call_next):
        req_id = (
            request.headers.get("x-request-id")
            or request.headers.get("x-correlation-id")
            or f"req_{int(time.time() * 1000)}_{secrets.token_hex(4)}"
        )
        request_id_ctx.set(req_id)

        forwarded = request.headers.get("x-forwarded-for")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (
            request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")
        )
        client_ip_ctx.set(client_ip)

        path = request.url.path
        method = request.method
        start_time = time.perf_counter()

        # Filter high-frequency noise from static files or basic uptime pings if necessary
        is_static = path.startswith("/uploads") or path.startswith("/email-assets")

        if not is_static:
            logger.info_event(
                module="HTTP",
                event="API_REQUEST_RECEIVED",
                message=f"Incoming HTTP {method} request to {path}",
                action="Routing request through FastAPI middleware pipeline",
                result="PROCESSING",
                path=path,
                method=method,
                query_params=str(request.query_params) if request.query_params else None,
            )

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            response.headers["X-Request-ID"] = req_id

            if not is_static:
                log_fn = logger.info_event if response.status_code < 400 else logger.warning_event
                log_fn(
                    module="HTTP",
                    event="API_RESPONSE_COMPLETED",
                    message=f"HTTP {method} {path} returned status {response.status_code} in {duration_ms}ms",
                    action="Dispatched response back to client",
                    result=f"STATUS_{response.status_code}",
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                    path=path,
                    method=method,
                )
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.critical_event(
                module="HTTP",
                event="UNHANDLED_HTTP_EXCEPTION",
                message=f"Unhandled exception while processing {method} {path}: {str(exc)}",
                action="Caught at RequestObservabilityMiddleware boundary; delegating to exception handler",
                result="EXCEPTION",
                duration_ms=duration_ms,
                path=path,
                method=method,
                error=str(exc),
            )
            raise exc

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
    blog_routes,
    shiprocket_routes,
    cron_routes,
)

# Ensure upload directory exists
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app = FastAPI(title="Tronix365 API", version="1.2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add RequestObservabilityMiddleware for correlation tracking & structured latency logs
app.add_middleware(RequestObservabilityMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_trace = traceback.format_exc()
    logger.critical_event(
        module="SYSTEM",
        event="GLOBAL_EXCEPTION",
        message=f"Unhandled top-level exception on {request.method} {request.url.path}: {str(exc)}",
        action="Global exception handler caught unhandled crash; responding with 500 JSON",
        result="INTERNAL_SERVER_ERROR",
        path=request.url.path,
        method=request.method,
        error=str(exc),
        traceback=error_trace,
    )

    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"

    req_id = request.headers.get("x-request-id") or request_id_ctx.get()
    if req_id:
        headers["X-Request-ID"] = req_id

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc),
            "request_id": req_id,
        },
        headers=headers,
    )


@app.on_event("startup")
async def startup():
    logger.info_event(
        module="SYSTEM",
        event="APPLICATION_STARTUP",
        message="Tronix365 API application initializing services...",
        action="Configuring cache, database connections, and background schema migrations",
        result="INITIALIZING",
    )

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        from fastapi_cache.backends.redis import RedisBackend

        redis_client = redis.from_url(redis_url, encoding="utf8", decode_responses=True)
        redis_client.ping()
        FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache")
        logger.info_event(
            module="CACHE",
            event="REDIS_CONNECTED",
            message=f"Redis cache initialized successfully with URL: {redis_url}",
            action="Configured FastAPICache with RedisBackend",
            result="SUCCESS",
        )
    except Exception as e:
        logger.warning_event(
            module="CACHE",
            event="REDIS_FALLBACK",
            message=f"Redis connection failed ({str(e)}), falling back to InMemoryBackend",
            action="Fallback to InMemory cache for development/resilience",
            result="FALLBACK_ACTIVE",
        )
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")

    try:
        await run_in_threadpool(Base.metadata.create_all, bind=engine)
        await run_in_threadpool(auto_migrate)
        logger.info_event(
            module="DATABASE",
            event="SCHEMA_VERIFIED",
            message="Database tables & schema columns successfully verified and migrated.",
            action="Base.metadata.create_all and auto_migrate completed",
            result="SUCCESS",
        )

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
                    logger.info_event(
                        module="DATABASE",
                        event="PRICE_SYNC_COMPLETED",
                        message="Synced legacy sale_prices to product.price in DB.",
                        action="Database record normalization",
                        result="SUCCESS",
                    )

        await run_in_threadpool(_sync_prices)
    except Exception as e:
        logger.critical_event(
            module="DATABASE",
            event="STARTUP_DB_ERROR",
            message=f"Database connection error during application startup: {str(e)}",
            action="Check database credentials and network connectivity",
            result="FAILURE",
            error=str(e),
        )


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

# Uploads serving: Checks disk first for instant static I/O;
# If missing from disk (e.g. Render container restart / wiped ephemeral storage),
# automatically retrieves from the persistent database and re-caches to disk.
@app.get("/uploads/{filename:path}")
async def serve_uploaded_media(filename: str, db: Session = Depends(get_db)):
    safe_filename = os.path.basename(filename)
    local_path = os.path.join(UPLOAD_DIR, safe_filename)

    # 1. Disk Cache Hit: Serve immediately with long-lived client caching
    if os.path.exists(local_path) and os.path.isfile(local_path):
        return FileResponse(
            local_path,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "Access-Control-Allow-Origin": "*",
            },
        )

    # 2. Disk Miss: Fallback to persistent database storage
    media = db.query(UploadedMediaDB).filter(UploadedMediaDB.filename == safe_filename).first()
    if media and media.data:
        try:
            with open(local_path, "wb") as f:
                f.write(media.data)
        except Exception as e:
            print(f"Warning: could not write local cache file: {e}")

        return Response(
            content=media.data,
            media_type=media.mime_type or "image/webp",
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "Access-Control-Allow-Origin": "*",
            },
        )

    raise HTTPException(status_code=404, detail="Uploaded file not found")

app.mount("/email-assets", StaticFiles(directory="email_assets"), name="email_assets")

# Base endpoints (Supporting both GET and HEAD for uptime monitors like Cron-Job.org / UptimeRobot)
@app.api_route("/", methods=["GET", "HEAD"])
async def read_root():
    return {"message": "Welcome to Tronix365 API", "status": "running"}


@app.api_route("/health", methods=["GET", "HEAD"], status_code=200)
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
app.include_router(blog_routes.router)
app.include_router(shiprocket_routes.router)
app.include_router(cron_routes.router)

