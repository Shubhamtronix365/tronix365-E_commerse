from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import UserDB, TokenData
from auth import SECRET_KEY, ALGORITHM
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> UserDB:
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        if email is None or token_type != "access":
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = db.query(UserDB).filter(UserDB.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_admin(
    current_user: UserDB = Depends(get_current_user)
) -> UserDB:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin privileges required.",
        )
    return current_user


async def get_current_blog_author(
    current_user: UserDB = Depends(get_current_user)
) -> UserDB:
    if current_user.role not in ["admin", "blog_author"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Blog Author or Admin privileges required.",
        )
    return current_user

