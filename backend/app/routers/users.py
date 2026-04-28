from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.grant import GrantedItemOut, UserVaultResponse
from app.schemas.user import RoleUpdateRequest, UserOut
from app.schemas.vault import VaultItemOut
from app.services.encryption_service import EncryptionService
from app.services.user_service import UserService
from app.services.vault_service import VaultService
from app.utils.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/users", tags=["users"])

_enc = EncryptionService(settings.master_encryption_key)


def _vault_svc(db: AsyncSession) -> VaultService:
    return VaultService(db, _enc)


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


@router.get("/{user_id}/vault", response_model=UserVaultResponse)
async def get_user_vault(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin only: see a user's own items and items shared with them."""
    target = await UserRepository(db).get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    vsvc = _vault_svc(db)
    own = await vsvc._repo.list_by_owner(user_id)
    shared_pairs = await vsvc.list_shared_items_for_user_id(user_id)

    def _build(item):
        from app.schemas.vault import CredentialFieldOut
        decrypted = vsvc.decrypt_fields(item)
        return VaultItemOut(
            id=item.id,
            owner_id=item.owner_id,
            title=item.title,
            description=item.description,
            created_at=item.created_at,
            updated_at=item.updated_at,
            fields=[CredentialFieldOut(**f) for f in decrypted],
        )

    return UserVaultResponse(
        own_items=[_build(i) for i in own],
        shared_items=[
            GrantedItemOut(
                grant_id=g.id,
                granted_by_username=g.grantor.username if g.grantor else "?",
                item=_build(item),
            )
            for g, item in shared_pairs
        ],
    )


@router.get("/audit-log")
async def get_audit_log(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    event: str | None = Query(None),
    actor_id: str | None = Query(None),
):
    """Admin only: paginated audit log."""
    q = select(AuditLog).order_by(desc(AuditLog.timestamp))
    if event:
        q = q.where(AuditLog.event == event)
    if actor_id:
        q = q.where(AuditLog.actor_id == actor_id)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp,
            "event": r.event,
            "actor_id": r.actor_id,
            "actor_email": r.actor_email,
            "resource_type": r.resource_type,
            "resource_id": r.resource_id,
            "detail": r.detail,
            "ip_address": r.ip_address,
        }
        for r in rows
    ]
