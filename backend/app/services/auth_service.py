"""Auth business logic — kept deliberately lean; no DB access here."""
from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, SetupRequest
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = UserRepository(db)

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
        return await self._repo.create(
            email=data.email,
            username=data.username,
            hashed_password=hash_password(data.password),
            role=UserRole.external,  # admin promotes later
        )

    # ── Login ─────────────────────────────────────────────────────────────────

    async def login(self, data: LoginRequest) -> dict:
        user = await self._repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
        return self._issue_tokens(user)

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
