from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import RoleUpdateRequest, UserOut
from app.services.user_service import UserService
from app.utils.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin & Team can see user list; External cannot."""
    svc = UserService(db)
    return await svc.list_users(current_user)


@router.patch("/{user_id}/role", response_model=UserOut)
async def assign_role(
    user_id: str,
    body: RoleUpdateRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    return await svc.assign_role(admin, user_id, body.role)


@router.patch("/{user_id}/toggle-active", response_model=UserOut)
async def toggle_active(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    return await svc.toggle_active(admin, user_id)
