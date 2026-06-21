import os
import hashlib
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from main import app
from database import get_db, Base
from models import UserDB, OTPDB

# Setup clean test SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_otp_db.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def setup_module(module):
    # Recreate tables in test database
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    # Drop tables and remove file
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_otp_db.db"):
        try:
            os.remove("test_otp_db.db")
        except:
            pass

def test_direct_send_otp_disabled():
    # Calling /auth/send-otp directly must fail
    response = client.post("/auth/send-otp", json={"email": "direct@example.com"})
    assert response.status_code == 400
    assert "Password check is mandatory" in response.json()["detail"]

def test_signup_and_verify_otp():
    email = "signup_flow_user@example.com"
    password = "MySecurePassword123"
    full_name = "Signup Tester"

    # 1. Signup (should trigger OTP statelessly and return signup_session)
    response = client.post("/signup", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "otp_required"
    assert res_data["email"] == email
    signup_session = res_data["signup_session"]
    assert signup_session is not None

    db = TestingSessionLocal()
    user_record = db.query(UserDB).filter(UserDB.email == email).first()
    assert user_record is None  # User MUST NOT be saved in DB yet!

    # 2. Get generated OTP from DB and set known hash
    otp_record = db.query(OTPDB).filter(OTPDB.email == email).first()
    assert otp_record is not None
    known_otp = "111222"
    otp_record.otp_hash = hashlib.sha256(known_otp.encode()).hexdigest()
    db.commit()

    # 3. Verify with wrong OTP
    verify_response = client.post("/auth/verify-otp", json={
        "email": email,
        "otp": "000000",
        "signup_session": signup_session
    })
    assert verify_response.status_code == 400
    assert "Incorrect OTP" in verify_response.json()["detail"]

    # 4. Verify with correct OTP
    verify_response = client.post("/auth/verify-otp", json={
        "email": email,
        "otp": known_otp,
        "signup_session": signup_session
    })
    assert verify_response.status_code == 200
    json_data = verify_response.json()
    assert "access_token" in json_data
    assert "refresh_token" in json_data

    # Ensure user is now created and active in DB
    user_record = db.query(UserDB).filter(UserDB.email == email).first()
    assert user_record is not None
    assert user_record.is_active is True
    db.close()

def test_login_and_verify_otp():
    email = "login_flow_user@example.com"
    password = "LoginPassword123"
    full_name = "Login Tester"

    # Create active user first
    db = TestingSessionLocal()
    from auth import get_password_hash
    hashed_password = get_password_hash(password)
    user = UserDB(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        role="user",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.close()

    # 1. Login with credentials (must return otp_required)
    login_response = client.post("/login", data={
        "username": email,
        "password": password
    })
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert login_data["status"] == "otp_required"
    assert login_data["email"] == email

    # 2. Get the generated OTP from DB and set known hash
    db = TestingSessionLocal()
    otp_record = db.query(OTPDB).filter(OTPDB.email == email).order_by(OTPDB.id.desc()).first()
    assert otp_record is not None
    known_otp = "333444"
    otp_record.otp_hash = hashlib.sha256(known_otp.encode()).hexdigest()
    db.commit()

    # 3. Verify
    verify_response = client.post("/auth/verify-otp", json={"email": email, "otp": known_otp})
    assert verify_response.status_code == 200
    assert "access_token" in verify_response.json()
    db.close()

def test_resend_rate_limits():
    email = "resend_limit_user@example.com"
    password = "ResendPassword123"

    # Register first
    client.post("/signup", json={
        "email": email,
        "password": password,
        "full_name": "Resend Tester"
    })

    # Immediate resend should fail (< 30 seconds check)
    response = client.post("/auth/resend-otp", json={"email": email})
    assert response.status_code == 400
    assert "30 seconds" in response.json()["detail"]
