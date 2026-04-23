from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.repositories.grant_repository import GrantRepository
from app.schemas.auth import (
    LoginRequest,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    SetupRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.services.auth_service import AuthService
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/setup/status")
async def setup_status(db: AsyncSession = Depends(get_db)):
    """Frontend calls this on startup to decide whether to show the setup screen."""
    svc = AuthService(db)
    return {"setup_complete": await svc.is_setup_complete()}


@router.post("/setup", response_model=UserOut, status_code=201)
async def create_first_admin(body: SetupRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    user = await svc.create_first_admin(body)
    return user


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    user = await svc.register(body)
    # Activate any pending grants that were shared to this email before registration
    grant_repo = GrantRepository(db)
    pending = await grant_repo.list_pending_by_email(body.email)
    for grant in pending:
        grant.granted_to_id = user.id
        await grant_repo.save(grant)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    return await svc.login(body)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    return await svc.refresh(body.refresh_token)


@router.post("/reset-password", status_code=204)
async def reset_password(
    body: PasswordResetRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    await svc.reset_own_password(current_user, body.current_password, body.new_password)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
