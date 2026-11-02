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
from logging_config import get_logger

logger = get_logger("auth")
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
            logger.warning_event(
                module="AUTH",
                event="OTP_REQUEST_REJECTED_BLOCKED",
                message=f"OTP request rejected: account {email} is blocked for {mins} more minutes",
                action="Blocked OTP generation",
                result="ACCOUNT_BLOCKED",
                email=email,
            )
            raise HTTPException(
                status_code=400,
                detail=f"Verification temporarily blocked due to too many incorrect attempts. Please try again after {mins} minute(s)."
            )

    # 2. Prevent abuse: resend allowed only after 30 seconds
    latest_otp = db.query(OTPDB).filter(OTPDB.email == email).order_by(OTPDB.id.desc()).first()
    if latest_otp:
        time_since_creation = (datetime.utcnow() - latest_otp.created_at.replace(tzinfo=None)).total_seconds()
        if time_since_creation < 30:
            logger.warning_event(
                module="AUTH",
                event="OTP_COOLDOWN_ACTIVE",
                message=f"OTP request throttled for {email}: 30-second cooldown active ({int(30 - time_since_creation)}s left)",
                action="Rejected OTP request",
                result="RATE_LIMITED",
                email=email,
            )
            raise HTTPException(
                status_code=400,
                detail="Please wait 30 seconds before requesting another OTP."
            )

    # 3. Prevent abuse: max 3 resend attempts (total 4 requests) within 15 minutes
    time_limit = datetime.utcnow() - timedelta(minutes=15)
    otp_count = db.query(OTPDB).filter(OTPDB.email == email, OTPDB.created_at >= time_limit).count()
    if otp_count >= 4:
        logger.warning_event(
            module="AUTH",
            event="OTP_WINDOW_LIMIT_EXCEEDED",
            message=f"Maximum OTP requests ({otp_count}) reached for {email} in 15-minute window",
            action="Rejected OTP generation",
            result="QUOTA_EXCEEDED",
            email=email,
        )
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

    logger.info_event(
        module="AUTH",
        event="OTP_GENERATED_AND_DISPATCHED",
        message=f"New 6-digit verification OTP generated for customer {email} (expires in 2 minutes)",
        action="Created secure SHA-256 hash record and triggered email dispatch",
        result="SUCCESS",
        email=email,
    )

    # 9. Send via Brevo
    sent = send_otp_email(email, otp)
    if not sent:
        # Never log plain OTP in production logs!
        try:
            with open("otp_debug.txt", "w") as f:
                f.write(otp)
        except Exception as e:
            pass

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
        logger.warning_event(
            module="AUTH",
            event="OTP_VERIFICATION_NO_RECORD",
            message=f"OTP verification failed: no active OTP request found for {email}",
            action="Rejected verification request",
            result="NOT_FOUND",
            email=email,
        )
        raise HTTPException(status_code=400, detail="No active OTP request found for this email.")

    # 3. Check expiration
    if otp_record.expires_at.replace(tzinfo=None) < datetime.utcnow():
        otp_record.is_verified = True
        db.commit()
        logger.warning_event(
            module="AUTH",
            event="OTP_VERIFICATION_EXPIRED",
            message=f"OTP verification failed: token expired for {email}",
            action="Invalidated expired OTP record",
            result="EXPIRED",
            email=email,
        )
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # 4. Check block inside OTP
    if otp_record.attempts >= 5:
        if user:
            user.otp_blocked_until = datetime.utcnow() + timedelta(minutes=15)
            db.commit()
        logger.warning_event(
            module="AUTH",
            event="OTP_LOCKOUT_TRIGGERED",
            message=f"Account {email} locked out for 15 minutes due to exceeding maximum allowed verification attempts",
            action="Set user.otp_blocked_until to +15 minutes",
            result="LOCKED_OUT",
            email=email,
        )
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
            logger.warning_event(
                module="AUTH",
                event="OTP_LOCKOUT_TRIGGERED",
                message=f"Account {email} locked out for 15 minutes due to 5 consecutive wrong OTP attempts",
                action="Set user.otp_blocked_until to +15 minutes",
                result="LOCKED_OUT",
                email=email,
            )
            raise HTTPException(
                status_code=400,
                detail="Too many incorrect attempts. Verification blocked for 15 minutes."
            )

        remaining = 5 - otp_record.attempts
        logger.warning_event(
            module="AUTH",
            event="OTP_INCORRECT_ATTEMPT",
            message=f"Incorrect OTP submitted for {email}. Attempt {otp_record.attempts}/5. {remaining} attempt(s) remaining.",
            action="Incremented attempts counter",
            result="INVALID_CODE",
            email=email,
            attempts=otp_record.attempts,
        )
        raise HTTPException(status_code=400, detail=f"Incorrect OTP. {remaining} attempt(s) remaining.")

    # 6. Success! Invalidate OTP immediately
    otp_record.is_verified = True
    
    is_new_registration = False
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
        is_new_registration = True
    else:
        user.otp_blocked_until = None
        user.is_active = True
        db.commit()

    logger.info_event(
        module="AUTH",
        event="OTP_VERIFICATION_SUCCESSFUL",
        message=f"Customer {user.email} successfully completed 2FA authentication (New User: {is_new_registration})",
        action="Created user record (if registration) and generated JWT session tokens",
        result="SUCCESS",
        user_id=user.id,
        email=user.email,
        role=user.role,
        is_new_user=is_new_registration,
    )

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
            logger.warning_event(
                module="AUTH",
                event="SIGNUP_REJECTED_DUPLICATE_EMAIL",
                message=f"Registration rejected: account already exists with email {user.email}",
                action="Aborted registration",
                result="DUPLICATE_ACCOUNT",
                email=user.email,
            )
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

        logger.info_event(
            module="AUTH",
            event="SIGNUP_SESSION_INITIATED",
            message=f"Customer registration initiated for {user.email}. Dispatching verification OTP.",
            action="Created temporary signup token and triggered OTP",
            result="OTP_REQUIRED",
            email=user.email,
            full_name=user.full_name,
        )

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
        logger.error_event(
            module="AUTH",
            event="SIGNUP_INTERNAL_ERROR",
            message=f"Unexpected error during signup for {user.email}: {str(e)}",
            action="Caught unexpected exception in signup route",
            result="ERROR",
            email=user.email,
            error=str(e),
        )
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
        logger.warning_event(
            module="AUTH",
            event="LOGIN_FAILED_NOT_FOUND",
            message=f"Customer login failed: no user account exists for {username}",
            action="Rejected login attempt",
            result="USER_NOT_FOUND",
            email=username,
        )
        raise HTTPException(
            status_code=404,
            detail="No account found with this email. Please sign up.",
        )

    if user.hashed_password == "OAUTH_USER_NO_PASSWORD":
        logger.warning_event(
            module="AUTH",
            event="LOGIN_FAILED_OAUTH_ACCOUNT",
            message=f"Customer login failed: account {username} was registered with Google OAuth",
            action="Prompted user to login via Google OAuth",
            result="OAUTH_REQUIRED",
            email=username,
        )
        raise HTTPException(
            status_code=400,
            detail="This account was registered with Google. Please use 'Sign in with Google' below.",
        )

    if not verify_password(form_data.password, user.hashed_password):
        logger.warning_event(
            module="AUTH",
            event="LOGIN_FAILED_WRONG_PASSWORD",
            message=f"Customer login failed: invalid password entered for account {username}",
            action="Rejected login attempt",
            result="INVALID_CREDENTIALS",
            email=username,
        )
        raise HTTPException(
            status_code=401,
            detail="Incorrect password. Please try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role == "admin":
        logger.warning_event(
            module="AUTH",
            event="LOGIN_ADMIN_REDIRECT_REQUIRED",
            message=f"Administrator credentials entered on customer portal for {username}",
            action="Rejected customer login, instructed to use admin portal",
            result="ROLE_RESTRICTED",
            email=username,
        )
        raise HTTPException(
            status_code=403,
            detail="Admin credentials not allowed here. Please use Admin Login.",
        )

    if user.otp_blocked_until:
        if user.otp_blocked_until.replace(tzinfo=None) > datetime.utcnow():
            diff = (user.otp_blocked_until.replace(tzinfo=None) - datetime.utcnow()).total_seconds()
            mins = int(diff // 60) + 1
            logger.warning_event(
                module="AUTH",
                event="LOGIN_BLOCKED_ACCOUNT_LOCKOUT",
                message=f"Login attempt rejected for {username}: account is locked for {mins} more minutes",
                action="Blocked login",
                result="ACCOUNT_LOCKED",
                email=username,
            )
            raise HTTPException(
                status_code=400,
                detail=f"Verification temporarily blocked due to too many incorrect attempts. Please try again after {mins} minute(s)."
            )

    logger.info_event(
        module="AUTH",
        event="LOGIN_PASSWORD_VERIFIED",
        message=f"Customer {user.email} password verified; dispatching 2FA OTP",
        action="Triggered 2FA OTP email",
        result="OTP_REQUIRED",
        email=user.email,
        user_id=user.id,
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
        logger.warning_event(
            module="AUTH",
            event="ADMIN_LOGIN_FAILED_NOT_FOUND",
            message=f"Admin login failed: no account exists for {admin_username}",
            action="Rejected admin authentication",
            result="NOT_FOUND",
            email=admin_username,
        )
        raise HTTPException(
            status_code=404,
            detail="No admin account found with this email.",
        )

    if user.role != "admin":
        logger.warning_event(
            module="AUTH",
            event="ADMIN_LOGIN_ACCESS_DENIED",
            message=f"Admin login failed: user {admin_username} has role '{user.role}', required 'admin'",
            action="Denied admin access",
            result="FORBIDDEN",
            email=admin_username,
        )
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin credentials required.",
        )

    if not verify_password(form_data.password, user.hashed_password):
        logger.warning_event(
            module="AUTH",
            event="ADMIN_LOGIN_FAILED_WRONG_PASSWORD",
            message=f"Admin login failed: incorrect password for {admin_username}",
            action="Rejected admin credentials",
            result="INVALID_PASSWORD",
            email=admin_username,
        )
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

    logger.info_event(
        module="AUTH",
        event="ADMIN_LOGIN_SUCCESSFUL",
        message=f"Administrator {user.email} authenticated successfully into Admin Dashboard",
        action="Issued admin JWT session tokens",
        result="SUCCESS",
        user_id=user.id,
        email=user.email,
        role="admin",
    )

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

        is_new_user = False
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
            is_new_user = True
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

        logger.info_event(
            module="AUTH",
            event="GOOGLE_AUTH_SUCCESSFUL",
            message=f"Google OAuth authentication successful for {user.email} (New User: {is_new_user})",
            action="Created/authenticated OAuth account and generated JWT tokens",
            result="SUCCESS",
            user_id=user.id,
            email=user.email,
            is_new_user=is_new_user,
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user_name": user.full_name,
            "role": user.role,
            "email": user.email,
        }

    except ValueError:
        logger.warning_event(
            module="AUTH",
            event="GOOGLE_AUTH_TOKEN_INVALID",
            message="Google OAuth verification failed: Invalid Google ID token",
            action="Rejected OAuth authentication",
            result="INVALID_TOKEN",
        )
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        logger.error_event(
            module="AUTH",
            event="GOOGLE_AUTH_EXCEPTION",
            message=f"Error during Google OAuth flow: {str(e)}",
            action="Caught Google OAuth exception",
            result="ERROR",
            error=str(e),
        )
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
    if not db_token:
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

    expires_at = (
        db_token.expires_at.replace(tzinfo=None)
        if db_token.expires_at and db_token.expires_at.tzinfo
        else db_token.expires_at
    )
    if expires_at and expires_at < datetime.utcnow():
        db.delete(db_token)
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    user = db.query(UserDB).filter(UserDB.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = create_access_token(data={"sub": user.email, "role": user.role})

    logger.info_event(
        module="AUTH",
        event="ACCESS_TOKEN_REFRESHED",
        message=f"Session access token successfully refreshed for user #{user.id} ({user.email})",
        action="Issued fresh access token using valid refresh token",
        result="SUCCESS",
        user_id=user.id,
        email=user.email,
    )

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
        uid = db_token.user_id
        db.delete(db_token)
        db.commit()
        logger.info_event(
            module="AUTH",
            event="USER_LOGGED_OUT",
            message=f"User #{uid} successfully logged out and session revoked",
            action="Deleted refresh token record from database",
            result="LOGGED_OUT",
            user_id=uid,
        )
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
    changes = []
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
        changes.append("full_name")

    if user_update.email is not None and user_update.email != current_user.email:
        existing_user = (
            db.query(UserDB).filter(UserDB.email == user_update.email).first()
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_update.email
        changes.append("email")

    if user_update.password is not None and user_update.password.strip() != "":
        current_user.hashed_password = get_password_hash(user_update.password)
        changes.append("password")

    if user_update.profile_picture is not None:
        current_user.profile_picture = user_update.profile_picture
        changes.append("profile_picture")

    db.commit()
    db.refresh(current_user)

    logger.info_event(
        module="AUTH",
        event="USER_PROFILE_UPDATED",
        message=f"User #{current_user.id} ({current_user.email}) profile updated: {', '.join(changes)}",
        action="Updated user record in database",
        result="UPDATED",
        user_id=current_user.id,
        email=current_user.email,
        updated_fields=changes,
    )

    return current_user
