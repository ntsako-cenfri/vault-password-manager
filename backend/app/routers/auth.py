from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.limiter import limiter
from app.models.user import User
from app.repositories.grant_repository import GrantRepository
from jose import JWTError

from app.schemas.auth import (
    CompletePasswordChangeRequest,
    LoginRequest,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    SetupRequest,
    TokenResponse,
    TotpDisableRequest,
    TotpEnableRequest,
    TotpSetupResponse,
    TotpVerifyLoginRequest,
)
from app.utils.security import decode_invite_token
from app.schemas.user import UserOut
from app.services.auth_service import AuthService
from app.utils.http import get_client_ip
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
    if body.invite_token:
        try:
            invited_email = decode_invite_token(body.invite_token)
        except JWTError:
            raise HTTPException(status_code=400, detail="Invalid or expired invite link")
        if invited_email.lower() != body.email.lower():
            raise HTTPException(status_code=400, detail="Email does not match the invite link")
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
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    ip = get_client_ip(request)
    return await svc.login(body, ip=ip)


@router.post("/complete-password-change", response_model=TokenResponse)
@limiter.limit("10/minute")
async def complete_password_change(
    request: Request, body: CompletePasswordChangeRequest, db: AsyncSession = Depends(get_db)
):
    """Exchange a password-change token (issued by /login when must_change_password
    is set) plus a new password for full access/refresh tokens."""
    svc = AuthService(db)
    return await svc.complete_forced_password_change(body.password_change_token, body.new_password)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
async def refresh(request: Request, body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    return await svc.refresh(body.refresh_token)


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.auth_service import AuthService as _AS
    raw = request.headers.get("authorization", "").removeprefix("Bearer ").strip() or None
    svc = _AS(db)
    await svc.logout(current_user, token=raw)


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


# ── TOTP 2FA ──────────────────────────────────────────────────────────────────

@router.post("/totp/setup", response_model=TotpSetupResponse)
async def totp_setup(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new TOTP secret + otpauth URI. Scan QR code then call /totp/enable."""
    svc = AuthService(db)
    return await svc.setup_totp(current_user)


@router.post("/totp/enable", status_code=204)
async def totp_enable(
    body: TotpEnableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm TOTP setup by submitting the first code from the authenticator app."""
    svc = AuthService(db)
    await svc.enable_totp(current_user, body.code)


@router.post("/totp/disable", status_code=204)
async def totp_disable(
    body: TotpDisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disable TOTP. Requires a valid current code to prevent accidental lockout."""
    svc = AuthService(db)
    await svc.disable_totp(current_user, body.code)


@router.post("/totp/verify-login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def totp_verify_login(
    request: Request,
    body: TotpVerifyLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid MFA challenge token + TOTP code for full access/refresh tokens."""
    svc = AuthService(db)
    return await svc.verify_totp_login(body.mfa_token, body.code)
