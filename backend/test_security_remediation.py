import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import io
from PIL import Image
from models import UserDB, ProductDB
from auth import get_password_hash, create_access_token, create_refresh_token

# Setup a clean test SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_security.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def client():
    # Using 'with' block triggers FastAPI startup event (lifespan)
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create dummy user and admin
    hashed_user_password = get_password_hash("userpass")
    hashed_admin_password = get_password_hash("adminpass")

    user = UserDB(
        email="user@example.com",
        hashed_password=hashed_user_password,
        full_name="Normal User",
        role="user",
        is_active=True,
    )
    admin = UserDB(
        email="admin@example.com",
        hashed_password=hashed_admin_password,
        full_name="System Admin",
        role="admin",
        is_active=True,
    )
    product = ProductDB(
        id=999,
        title="Test Product",
        description="A great product",
        price=10.0,
        category="Electronics",
        stock=10,
    )
    db.add(user)
    db.add(admin)
    db.add(product)
    db.commit()
    db.close()

    yield

    # Cleanup: dispose engine to release SQLite locks
    engine.dispose()
    if os.path.exists("./test_security.db"):
        try:
            os.remove("./test_security.db")
        except Exception as e:
            print(f"Cleanup warning: could not remove test DB file: {e}")


def get_tokens():
    user_token = create_access_token(data={"sub": "user@example.com", "role": "user"})
    admin_token = create_access_token(data={"sub": "admin@example.com", "role": "admin"})
    refresh_token = create_refresh_token(data={"sub": "user@example.com"})
    return user_token, admin_token, refresh_token


def test_unauthorized_access(client):
    """Verify that admin and mutation endpoints return 401 when unauthenticated."""
    routes = [
        ("GET", "/orders"),
        ("GET", "/admin/stats"),
        ("GET", "/admin/coupons"),
        ("POST", "/products"),
        ("PUT", "/products/999"),
        ("DELETE", "/products/999"),
        ("PUT", "/admin/orders/1/status"),
        ("GET", "/debug-orders"),
    ]

    for method, path in routes:
        if method == "GET":
            response = client.get(path)
        elif method == "POST":
            response = client.post(path, json={})
        elif method == "PUT":
            response = client.put(path, json={})
        elif method == "DELETE":
            response = client.delete(path)

        assert response.status_code == 401, f"{method} {path} should return 401"


def test_forbidden_access(client):
    """Verify that a regular user cannot access admin or mutation endpoints (returns 403)."""
    user_token, _, _ = get_tokens()
    headers = {"Authorization": f"Bearer {user_token}"}

    routes = [
        ("GET", "/orders", None),
        ("GET", "/admin/stats", None),
        ("GET", "/admin/coupons", None),
        ("POST", "/products", {"title": "New", "description": "Desc", "price": 1.0, "category": "Test"}),
        ("PUT", "/products/999", {"title": "Updated"}),
        ("DELETE", "/products/999", None),
        ("PUT", "/admin/orders/1/status", {"status": "confirmed"}),
        ("GET", "/debug-orders", None),
    ]

    for method, path, payload in routes:
        if method == "GET":
            response = client.get(path, headers=headers)
        elif method == "POST":
            response = client.post(path, json=payload, headers=headers)
        elif method == "PUT":
            response = client.put(path, json=payload, headers=headers)
        elif method == "DELETE":
            response = client.delete(path, headers=headers)

        assert response.status_code == 403, f"{method} {path} should return 403"


def test_admin_authorized_access(client):
    """Verify that an admin user can successfully access admin endpoints."""
    _, admin_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.get("/admin/stats", headers=headers)
    assert response.status_code == 200

    response = client.get("/admin/coupons", headers=headers)
    assert response.status_code == 200


def test_token_type_confusion(client):
    """Verify that a refresh token is rejected on access token endpoints."""
    _, _, refresh_token = get_tokens()
    headers = {"Authorization": f"Bearer {refresh_token}"}

    # Protected endpoint requiring access token
    response = client.get("/profile", headers=headers)
    assert response.status_code == 401


def test_upload_extension_restriction(client):
    """Verify that /upload rejects non-whitelisted file extensions."""
    user_token, _, _ = get_tokens()
    headers = {"Authorization": f"Bearer {user_token}"}

    # Create dummy non-image file content
    file_content = b"console.log('malicious script');"
    files = {"file": ("malicious.js", io.BytesIO(file_content), "application/javascript")}

    response = client.post("/upload", files=files, headers=headers)
    assert response.status_code == 400
    assert "Only images" in response.json()["detail"]


def test_upload_corrupt_image(client):
    """Verify that /upload rejects files with image extensions but invalid contents."""
    user_token, _, _ = get_tokens()
    headers = {"Authorization": f"Bearer {user_token}"}

    # A .jpg file extension with script contents
    file_content = b"<html><script>alert(1)</script></html>"
    files = {"file": ("xss.jpg", io.BytesIO(file_content), "image/jpeg")}

    response = client.post("/upload", files=files, headers=headers)
    assert response.status_code == 400
    assert "Invalid or corrupt image" in response.json()["detail"]


def test_upload_valid_image(client):
    """Verify that /upload accepts valid image uploads."""
    user_token, _, _ = get_tokens()
    headers = {"Authorization": f"Bearer {user_token}"}

    # Create a small valid red square image in memory using PIL
    file = io.BytesIO()
    image = Image.new("RGB", (100, 100), color="red")
    image.save(file, "jpeg")
    file.seek(0)

    files = {"file": ("valid.jpg", file, "image/jpeg")}

    response = client.post("/upload", files=files, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["url"].startswith("/uploads/")

    # Cleanup the saved file
    uploaded_filename = data["url"].split("/")[-1]
    saved_path = os.path.join("uploads", uploaded_filename)
    if os.path.exists(saved_path):
        os.remove(saved_path)


def test_payment_initiate_no_bypass(client):
    """Verify that /payment/initiate does not accept or process bypass parameter anymore."""
    user_token, _, _ = get_tokens()
    headers = {"Authorization": f"Bearer {user_token}"}

    payload = {
        "amount": 10.0,
        "firstname": "John",
        "email": "user@example.com",
        "productinfo": "Test Order",
        "items": [{"product_id": 999, "quantity": 1}],
        "phone": "9876543210",
        "address_line": "123 St",
        "city": "Delhi",
        "state": "Delhi",
        "pincode": "110001",
        "bypass": True,  # Attempting to bypass
    }

    response = client.post("/payment/initiate", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@example.com"

    # Verify that order is still PENDING in db and NOT confirmed immediately
    db = TestingSessionLocal()
    from models import OrderDB
    orders = db.query(OrderDB).filter(OrderDB.customer_email == "user@example.com").all()
    assert len(orders) == 1
    assert orders[0].status == "pending"  # Should remain pending
    db.close()


def test_mock_payment_open_redirect(client):
    """Verify that /payment/mock-process rejects external/unauthorized redirect URLs."""
    payload = {
        "key": "testkey",
        "txnid": "testtxn",
        "amount": "10.00",
        "productinfo": "test",
        "firstname": "test",
        "email": "test@example.com",
        "phone": "123",
        "surl": "https://evil.com/callback",  # Evil domain
        "furl": "http://localhost:8000/payment/callback",
        "hash": "somehash",
    }
    response = client.post("/payment/mock-process", data=payload)
    assert response.status_code == 400
    assert "Open Redirect prohibited" in response.json()["detail"]


def test_admin_search_products_and_orders(client):
    """Verify that backend search filters work for products and orders."""
    user_token, admin_token, _ = get_tokens()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Create a product with a unique SKV to test SKV search
    db = TestingSessionLocal()
    from models import ProductDB, OrderDB, OrderItemDB
    search_prod = ProductDB(
        id=1234,
        title="Special Arduino Board",
        description="A prototype microcontroller board",
        price=150.0,
        category="Microcontrollers",
        skv="ARD-SPEC-999",
        stock=5,
    )
    db.add(search_prod)
    db.commit()
    
    # Create an order containing that product
    search_order = OrderDB(
        id=8888,
        customer_email="customer_spec@example.com",
        total_amount=150.0,
        status="confirmed",
        full_name="Bhavesh Spec",
        phone="9999988888",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        txnid="TXN_SPEC_12345",
        items=[
            OrderItemDB(
                product_id=1234,
                quantity=1,
                price_at_purchase=150.0
            )
        ]
    )
    db.add(search_order)
    db.commit()
    db.close()
    
    # Test Product Search by SKV
    res = client.get("/products?search=ARD-SPEC-999")
    assert res.status_code == 200
    products = res.json()
    assert len(products) == 1
    assert products[0]["id"] == 1234
    
    # Test Order Search by Email
    res = client.get("/orders?search=customer_spec", headers=admin_headers)
    assert res.status_code == 200
    orders = res.json()
    assert len(orders) >= 1
    assert any(o["id"] == 8888 for o in orders)
    
    # Test Order Search by Full Name
    res = client.get("/orders?search=Bhavesh", headers=admin_headers)
    assert res.status_code == 200
    assert any(o["id"] == 8888 for o in res.json())
    
    # Test Order Search by Pincode
    res = client.get("/orders?search=400001", headers=admin_headers)
    assert res.status_code == 200
    assert any(o["id"] == 8888 for o in res.json())
    
    # Test Order Search by Product Title inside order
    res = client.get("/orders?search=Arduino", headers=admin_headers)
    assert res.status_code == 200
    assert any(o["id"] == 8888 for o in res.json())
    
    # Test Order Search by Product SKV inside order
    res = client.get("/orders?search=ARD-SPEC-999", headers=admin_headers)
    assert res.status_code == 200
    assert any(o["id"] == 8888 for o in res.json())
    
    # Test Order Search by order ID string formats (e.g. order_tronix_8888)
    res = client.get("/orders?search=order_tronix_8888", headers=admin_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == 8888
    
    # Test Order Search by order ID hash format (e.g. #8888)
    res = client.get("/orders?search=%238888", headers=admin_headers)  # %23 is #
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == 8888


def test_product_deletion_cascade(client):
    """Verify that deleting a product cleans up or updates related entities to prevent integrity violations."""
    _, admin_token, _ = get_tokens()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Create a product
    db = TestingSessionLocal()
    from models import ProductDB, WishlistItemDB, CartItemDB, ReviewDB, BundleDB, BundleProductDB, OrderDB, OrderItemDB
    prod = ProductDB(
        id=777,
        title="Cascade Test Product",
        description="To test deletion cascading",
        price=50.0,
        category="Test Category",
        stock=5
    )
    db.add(prod)
    db.commit()
    
    # 2. Add related references
    # Wishlist
    wish = WishlistItemDB(user_id=1, product_id=777)
    # Cart
    cart = CartItemDB(user_id=1, product_id=777, quantity=2)
    # Review
    rev = ReviewDB(product_id=777, user_id=1, user_email="user@example.com", user_name="User", rating=5, comment="Nice", created_at="2026-06-15")
    # Bundle
    bundle = BundleDB(id=777, name="Cascade Bundle", original_price=100.0, bundle_price=80.0)
    db.add(bundle)
    db.commit()
    bp = BundleProductDB(bundle_id=777, product_id=777)
    # Order
    order = OrderDB(id=7777, customer_email="user@example.com", total_amount=50.0)
    db.add(order)
    db.commit()
    oi = OrderItemDB(order_id=7777, product_id=777, quantity=1, price_at_purchase=50.0)
    
    db.add(wish)
    db.add(cart)
    db.add(rev)
    db.add(bp)
    db.add(oi)
    db.commit()
    db.close()
    
    # Delete the product via admin API
    res = client.delete("/products/777", headers=admin_headers)
    assert res.status_code == 204
    
    # Verify database state
    db = TestingSessionLocal()
    assert db.query(ProductDB).filter(ProductDB.id == 777).first() is None
    assert db.query(WishlistItemDB).filter(WishlistItemDB.product_id == 777).first() is None
    assert db.query(CartItemDB).filter(CartItemDB.product_id == 777).first() is None
    assert db.query(ReviewDB).filter(ReviewDB.product_id == 777).first() is None
    assert db.query(BundleProductDB).filter(BundleProductDB.product_id == 777).first() is None
    
    # Order item should still exist but its product_id must be None
    db_oi = db.query(OrderItemDB).filter(OrderItemDB.order_id == 7777).first()
    assert db_oi is not None
    assert db_oi.product_id is None
    db.close()
