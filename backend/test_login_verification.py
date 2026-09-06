import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import UserDB
from auth import get_password_hash

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_users():
    db = SessionLocal()
    # 1. Normal user with password
    normal_email = "test_verified_user@example.com"
    existing_normal = db.query(UserDB).filter(UserDB.email == normal_email).first()
    if not existing_normal:
        normal_user = UserDB(
            email=normal_email,
            hashed_password=get_password_hash("ValidPass123"),
            full_name="Verified Test User",
            role="user",
            is_active=True
        )
        db.add(normal_user)

    # 2. Google OAuth user (no password)
    oauth_email = "test_oauth_user@example.com"
    existing_oauth = db.query(UserDB).filter(UserDB.email == oauth_email).first()
    if not existing_oauth:
        oauth_user = UserDB(
            email=oauth_email,
            hashed_password="OAUTH_USER_NO_PASSWORD",
            full_name="OAuth Test User",
            role="user",
            is_active=True
        )
        db.add(oauth_user)

    db.commit()
    db.close()
    yield


def test_login_nonexistent_user():
    """Non-existent user must return 404 with 'No account found with this email. Please sign up.'"""
    res = client.post("/login", data={
        "username": "totally_nonexistent_email_12345@example.com",
        "password": "RandomPassword123"
    })
    assert res.status_code == 404
    assert res.json()["detail"] == "No account found with this email. Please sign up."


def test_login_oauth_user():
    """User registered via Google OAuth must return 400 prompting Google sign-in."""
    res = client.post("/login", data={
        "username": "test_oauth_user@example.com",
        "password": "AnyPassword123"
    })
    assert res.status_code == 400
    assert "registered with Google" in res.json()["detail"]


def test_login_wrong_password():
    """Existing user with incorrect password must return 401 'Incorrect password. Please try again.'"""
    res = client.post("/login", data={
        "username": "test_verified_user@example.com",
        "password": "WrongPassword999"
    })
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect password. Please try again."


def test_admin_login_nonexistent():
    """Nonexistent admin must return 404."""
    res = client.post("/admin/login", data={
        "username": "nonexistent_admin_12345@tronix365.in",
        "password": "AdminPassword123"
    })
    assert res.status_code == 404
    assert res.json()["detail"] == "No admin account found with this email."


def test_admin_login_forbidden_for_regular_user():
    """Regular user trying to access admin login must return 403."""
    res = client.post("/admin/login", data={
        "username": "test_verified_user@example.com",
        "password": "ValidPass123"
    })
    assert res.status_code == 403
    assert "Admin credentials required" in res.json()["detail"]
