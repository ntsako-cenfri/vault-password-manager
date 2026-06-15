"""JWT helpers and password hashing utilities."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
INVITE_TOKEN_EXPIRE_DAYS = 7


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, role: str, extra: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Raise JWTError on any failure."""
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])


def create_invite_token(email: str) -> str:
    """Create a signed invite token encoding the invited email."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email,
        "type": "invite",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(days=INVITE_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_invite_token(token: str) -> str:
    """Decode an invite token and return the invited email. Raise JWTError on failure."""
    payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    if payload.get("type") != "invite":
        raise JWTError("Not an invite token")
    return payload["sub"]


MFA_TOKEN_EXPIRE_MINUTES = 5


def create_mfa_token(user_id: str) -> str:
    """Short-lived token issued after password check; exchanged for full tokens once TOTP is verified."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": "mfa_challenge",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(minutes=MFA_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_mfa_token(token: str) -> str:
    """Decode an MFA challenge token and return user_id. Raise JWTError on failure."""
    payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    if payload.get("type") != "mfa_challenge":
        raise JWTError("Not an MFA challenge token")
    return payload["sub"]
