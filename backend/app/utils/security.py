"""JWT helpers and password hashing utilities."""
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, role: str, extra: dict | None = None) -> str:
    payload = {
        "sub": subject,
        "role": role,
        "type": "access",
        "exp": datetime.utcnow()
        + timedelta(minutes=settings.access_token_expire_minutes),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(subject: str) -> str:
    payload = {
        "sub": subject,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Raise JWTError on any failure."""
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
