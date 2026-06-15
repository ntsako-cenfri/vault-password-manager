"""Auth business logic — kept deliberately lean; no DB access here."""
from datetime import datetime, timezone

import pyotp
from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.revoked_token import RevokedToken
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, SetupRequest
from app.services.audit_service import AuditService
from app.utils.security import (
    create_access_token,
    create_mfa_token,
    create_refresh_token,
    decode_mfa_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._repo = UserRepository(db)
        self._audit = AuditService(db)

    # ── Setup ─────────────────────────────────────────────────────────────────

    async def is_setup_complete(self) -> bool:
        return (await self._repo.admin_count()) > 0

    async def create_first_admin(self, data: SetupRequest) -> User:
        if await self.is_setup_complete():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Setup already completed",
            )
        await self._assert_unique(data.email, data.username)
        return await self._repo.create(
            email=data.email,
            username=data.username,
            hashed_password=hash_password(data.password),
            role=UserRole.admin,
        )

    # ── Registration ──────────────────────────────────────────────────────────

    async def register(self, data: RegisterRequest) -> User:
        await self._assert_unique(data.email, data.username)
        user = await self._repo.create(
            email=data.email,
            username=data.username,
            hashed_password=hash_password(data.password),
            role=UserRole.external,  # admin promotes later
        )
        await self._audit.log("user.register", actor_id=str(user.id), actor_email=user.email)
        return user

    # ── Login ─────────────────────────────────────────────────────────────────

    async def login(self, data: LoginRequest, ip: str | None = None) -> dict:
        user = await self._repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            await self._audit.log(
                "auth.login_failed",
                actor_email=data.email,
                detail="Invalid credentials",
                ip_address=ip,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        if not user.is_active:
            await self._audit.log(
                "auth.login_failed",
                actor_id=str(user.id),
                actor_email=user.email,
                detail="Account disabled",
                ip_address=ip,
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
        await self._audit.log(
            "auth.login_success",
            actor_id=str(user.id),
            actor_email=user.email,
            ip_address=ip,
        )
        if user.totp_enabled:
            return {
                "mfa_required": True,
                "mfa_token": create_mfa_token(str(user.id)),
                "access_token": "",
                "refresh_token": "",
                "token_type": "bearer",
            }
        return self._issue_tokens(user)

    # ── TOTP 2FA ──────────────────────────────────────────────────────────────

    async def setup_totp(self, user: User) -> dict:
        """Generate a new TOTP secret and save it (not yet enabled until verify)."""
        secret = pyotp.random_base32()
        user.totp_secret = secret
        user.totp_enabled = False
        await self._repo.save(user)
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name="Vault PM")
        return {"secret": secret, "otpauth_uri": uri}

    async def enable_totp(self, user: User, code: str) -> None:
        """Verify the first TOTP code and mark 2FA as enabled."""
        if not user.totp_secret:
            raise HTTPException(status_code=400, detail="Start 2FA setup first")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code, valid_window=1):
            raise HTTPException(status_code=400, detail="Invalid code")
        user.totp_enabled = True
        await self._repo.save(user)
        await self._audit.log("auth.totp_enabled", actor_id=str(user.id), actor_email=user.email)

    async def disable_totp(self, user: User, code: str) -> None:
        """Verify current TOTP code then disable 2FA."""
        if not user.totp_enabled or not user.totp_secret:
            raise HTTPException(status_code=400, detail="2FA is not enabled")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code, valid_window=1):
            raise HTTPException(status_code=400, detail="Invalid code")
        user.totp_enabled = False
        user.totp_secret = None
        await self._repo.save(user)
        await self._audit.log("auth.totp_disabled", actor_id=str(user.id), actor_email=user.email)

    async def verify_totp_login(self, mfa_token: str, code: str) -> dict:
        """Verify MFA challenge token + TOTP code, return full JWT tokens."""
        try:
            user_id = decode_mfa_token(mfa_token)
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired MFA session")
        user = await self._repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.totp_enabled or not user.totp_secret:
            raise HTTPException(status_code=400, detail="2FA not configured")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code, valid_window=1):
            await self._audit.log("auth.totp_failed", actor_id=str(user.id), actor_email=user.email)
            raise HTTPException(status_code=401, detail="Invalid authenticator code")
        await self._audit.log("auth.totp_verified", actor_id=str(user.id), actor_email=user.email)
        return self._issue_tokens(user)

    # ── Logout — revoke the current access token ──────────────────────────────

    async def logout(self, user: User, token: str | None = None) -> None:
        if token:
            try:
                payload = decode_token(token)
                jti = payload.get("jti")
                exp = payload.get("exp")
                if jti and exp:
                    expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
                    self._db.add(RevokedToken(jti=jti, expires_at=expires_at))
                    await self._db.flush()
            except JWTError:
                pass  # already invalid — nothing to revoke
        await self._audit.log("auth.logout", actor_id=str(user.id), actor_email=user.email)

    # ── Token refresh ─────────────────────────────────────────────────────────

    async def refresh(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type")

        user = await self._repo.get_by_id(payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        return self._issue_tokens(user)

    # ── Password reset (self-service) ─────────────────────────────────────────

    async def reset_own_password(
        self, user: User, current_password: str, new_password: str
    ) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Current password incorrect"
            )
        user.hashed_password = hash_password(new_password)
        await self._repo.save(user)
        await self._audit.log(
            "auth.password_reset", actor_id=str(user.id), actor_email=user.email
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _issue_tokens(self, user: User) -> dict:
        return {
            "access_token": create_access_token(str(user.id), user.role),
            "refresh_token": create_refresh_token(str(user.id)),
            "token_type": "bearer",
        }

    async def _assert_unique(self, email: str, username: str) -> None:
        if await self._repo.get_by_email(email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        if await self._repo.get_by_username(username):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
