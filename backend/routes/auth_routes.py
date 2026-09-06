import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import JWTError, jwt

from database import get_db
from models import (
    UserDB,
    UserCreate,
    UserUpdate,
    UserResponse,
    Token,
    OTPDB,
    OTPSendRequest,
    OTPVerifyRequest,
    RefreshTokenDB,
)
from auth import (
    SECRET_KEY,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
)
from deps import get_current_user, limiter
from email_utils import send_otp_email

router = APIRouter(tags=["Authentication"])


class GoogleLoginRequest(BaseModel):
    credential: str


def generate_and_send_otp_core(email: str, db: Session):
    email = email.lower().strip()

    # 1. Check user block
    user = db.query(UserDB).filter(UserDB.email == email).first()
    if user and user.otp_blocked_until:
        if user.otp_blocked_until.replace(tzinfo=None) > datetime.utcnow():
            diff = (user.otp_blocked_until.replace(tzinfo=None) - datetime.utcnow()).total_seconds()
            mins = int(diff // 60) + 1
            raise HTTPException(
                status_code=400,
                detail=f"Verification temporarily blocked due to too many incorrect attempts. Please try again after {mins} minute(s)."
            )

    # 2. Prevent abuse: resend allowed only after 30 seconds
    latest_otp = db.query(OTPDB).filter(OTPDB.email == email).order_by(OTPDB.id.desc()).first()
    if latest_otp:
        time_since_creation = (datetime.utcnow() - latest_otp.created_at.replace(tzinfo=None)).total_seconds()
        if time_since_creation < 30:
            raise HTTPException(
                status_code=400,
                detail="Please wait 30 seconds before requesting another OTP."
            )

    # 3. Prevent abuse: max 3 resend attempts (total 4 requests) within 15 minutes
    time_limit = datetime.utcnow() - timedelta(minutes=15)
    otp_count = db.query(OTPDB).filter(OTPDB.email == email, OTPDB.created_at >= time_limit).count()
    if otp_count >= 4:
        raise HTTPException(
            status_code=400,
            detail="Maximum OTP requests reached. Please try again after 15 minutes."
        )

    # 4. Invalidate previous unverified OTPs
    db.query(OTPDB).filter(OTPDB.email == email, OTPDB.is_verified == False).update({"is_verified": True})
    db.commit()

    # 5. Generate random 6-digit OTP
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])

    # 7. Secure hashing (SHA-256)
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()

    # 8. Save OTP record
    expires_at = datetime.utcnow() + timedelta(minutes=2)
    db_otp = OTPDB(
        email=email,
        otp_hash=otp_hash,
        expires_at=expires_at
    )
    db.add(db_otp)
    db.commit()

    # 9. Send via Brevo
    sent = send_otp_email(email, otp)
    if not sent:
        print(f"--- [DEVELOPMENT ONLY] --- Email sending skipped. OTP for {email} is: {otp}")
        try:
            with open("otp_debug.txt", "w") as f:
                f.write(otp)
        except Exception as e:
            print(f"Error writing otp to debug file: {e}")

    return {"message": "OTP sent successfully"}


@router.post("/auth/send-otp")
@limiter.limit("5/minute")
async def send_otp(request: Request, body: OTPSendRequest, db: Session = Depends(get_db)):
    raise HTTPException(
        status_code=400,
        detail="Password check is mandatory. Please use the signup or login flow."
    )


@router.post("/auth/resend-otp")
@limiter.limit("5/minute")
async def resend_otp(request: Request, body: OTPSendRequest, db: Session = Depends(get_db)):
    return generate_and_send_otp_core(body.email, db)


@router.post("/auth/verify-otp", response_model=Token)
@limiter.limit("5/minute")
async def verify_otp(request: Request, body: OTPVerifyRequest, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    otp = body.otp.strip()

    # 1. Check user block if user exists
    user = db.query(UserDB).filter(UserDB.email == email).first()
    if user and user.otp_blocked_until:
        if user.otp_blocked_until.replace(tzinfo=None) > datetime.utcnow():
            diff = (user.otp_blocked_until.replace(tzinfo=None) - datetime.utcnow()).total_seconds()
            mins = int(diff // 60) + 1
            raise HTTPException(
                status_code=400,
                detail=f"Verification temporarily blocked due to too many incorrect attempts. Please try again after {mins} minute(s)."
            )

    # 2. Get latest unverified OTP
    otp_record = db.query(OTPDB).filter(OTPDB.email == email, OTPDB.is_verified == False).order_by(OTPDB.id.desc()).first()
    if not otp_record:
        raise HTTPException(status_code=400, detail="No active OTP request found for this email.")

    # 3. Check expiration
    if otp_record.expires_at.replace(tzinfo=None) < datetime.utcnow():
        otp_record.is_verified = True
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # 4. Check block inside OTP
    if otp_record.attempts >= 5:
        if user:
            user.otp_blocked_until = datetime.utcnow() + timedelta(minutes=15)
            db.commit()
        raise HTTPException(
            status_code=400,
            detail="Too many incorrect attempts. Verification blocked for 15 minutes."
        )

    # 5. Verify input
    input_hash = hashlib.sha256(otp.encode()).hexdigest()
    if otp_record.otp_hash != input_hash:
        otp_record.attempts += 1
        db.commit()

        if otp_record.attempts >= 5:
            if user:
                user.otp_blocked_until = datetime.utcnow() + timedelta(minutes=15)
                db.commit()
            raise HTTPException(
                status_code=400,
                detail="Too many incorrect attempts. Verification blocked for 15 minutes."
            )

        remaining = 5 - otp_record.attempts
        raise HTTPException(status_code=400, detail=f"Incorrect OTP. {remaining} attempt(s) remaining.")

    # 6. Success! Invalidate OTP immediately
    otp_record.is_verified = True
    
    if not user:
        if not body.signup_session:
            raise HTTPException(
                status_code=400,
                detail="Signup session token is required for registration."
            )
        
        try:
            payload = jwt.decode(body.signup_session, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "signup_session" or payload.get("sub") != email:
                raise HTTPException(status_code=400, detail="Invalid signup session token.")
        except JWTError:
            raise HTTPException(status_code=400, detail="Signup session token has expired or is invalid.")
        
        user = UserDB(
            email=email,
            hashed_password=payload.get("password"),
            full_name=payload.get("full_name"),
            role="user",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.otp_blocked_until = None
        user.is_active = True
        db.commit()

    # 7. Generate JWT access and refresh tokens
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
        "user_name": user.full_name,
        "role": user.role,
    }


@router.post("/signup", response_model=Token)
@limiter.limit("5/minute")
async def signup(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    try:
        user.email = user.email.lower().strip()
        db_user = db.query(UserDB).filter(UserDB.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = get_password_hash(user.password)

        expires_at = datetime.utcnow() + timedelta(minutes=10)
        payload = {
            "sub": user.email,
            "password": hashed_password,
            "full_name": user.full_name,
            "type": "signup_session",
            "exp": expires_at
        }
        signup_session = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

        generate_and_send_otp_core(user.email, db)

        return {
            "status": "otp_required",
            "email": user.email,
            "user_name": user.full_name,
            "role": "user",
            "signup_session": signup_session,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Signup Error: {str(e)}")


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    username = form_data.username.lower().strip()
    user = db.query(UserDB).filter(UserDB.email == username).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email. Please sign up.",
        )

    if user.hashed_password == "OAUTH_USER_NO_PASSWORD":
        raise HTTPException(
            status_code=400,
            detail="This account was registered with Google. Please use 'Sign in with Google' below.",
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password. Please try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin credentials not allowed here. Please use Admin Login.",
        )

    if user.otp_blocked_until:
        if user.otp_blocked_until.replace(tzinfo=None) > datetime.utcnow():
            diff = (user.otp_blocked_until.replace(tzinfo=None) - datetime.utcnow()).total_seconds()
            mins = int(diff // 60) + 1
            raise HTTPException(
                status_code=400,
                detail=f"Verification temporarily blocked due to too many incorrect attempts. Please try again after {mins} minute(s)."
            )

    generate_and_send_otp_core(user.email, db)

    return {
        "status": "otp_required",
        "email": user.email,
        "user_name": user.full_name,
        "role": user.role,
    }


@router.post("/admin/login", response_model=Token)
@limiter.limit("5/minute")
async def admin_login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    admin_username = form_data.username.lower().strip()
    user = db.query(UserDB).filter(UserDB.email == admin_username).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No admin account found with this email.",
        )

    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin credentials required.",
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password. Please try again.",
            headers={"WWW-Authenticate": "Bearer"},
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
        "user_name": user.full_name,
        "role": user.role,
    }


@router.post("/auth/google", response_model=Token)
async def google_auth(google_req: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        if not CLIENT_ID:
            raise HTTPException(status_code=500, detail="Google Client ID not configured")
            
        idinfo = id_token.verify_oauth2_token(
            google_req.credential, google_requests.Request(), CLIENT_ID
        )

        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])
        picture = idinfo.get('picture')

        user = db.query(UserDB).filter(UserDB.email == email).first()
        if not user:
            user = UserDB(
                email=email,
                full_name=name,
                profile_picture=picture,
                role="user",
                hashed_password="OAUTH_USER_NO_PASSWORD"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if picture and not user.profile_picture:
                user.profile_picture = picture
                db.commit()

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
            "user_name": user.full_name,
            "role": user.role,
            "email": user.email,
        }

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        print(f"Google Auth Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during Google Auth")


@router.post("/refresh", response_model=Token)
async def refresh_token_endpoint(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email: str = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

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
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_name": user.full_name,
        "role": user.role,
    }


@router.post("/logout")
async def logout(refresh_token: str, db: Session = Depends(get_db)):
    db_token = (
        db.query(RefreshTokenDB).filter(RefreshTokenDB.token == refresh_token).first()
    )
    if db_token:
        db.delete(db_token)
        db.commit()
    return {"message": "Logged out successfully"}


@router.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: UserDB = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name

    if user_update.email is not None and user_update.email != current_user.email:
        existing_user = (
            db.query(UserDB).filter(UserDB.email == user_update.email).first()
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_update.email

    if user_update.password is not None and user_update.password.strip() != "":
        current_user.hashed_password = get_password_hash(user_update.password)

    if user_update.profile_picture is not None:
        current_user.profile_picture = user_update.profile_picture

    db.commit()
    db.refresh(current_user)
    return current_user
