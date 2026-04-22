from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.share import ShareLinkCreate, ShareLinkOut, SharedItemResponse
from app.schemas.vault import CredentialFieldOut, VaultItemOut
from app.services.encryption_service import EncryptionService
from app.services.share_service import ShareService
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/shares", tags=["shares"])

_enc = EncryptionService(settings.master_encryption_key)


def _svc(db: AsyncSession) -> ShareService:
    return ShareService(db, _enc)


@router.post("/vault/{item_id}", response_model=ShareLinkOut, status_code=201)
async def create_share(
    item_id: str,
    body: ShareLinkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    return await svc.create_share(item_id, body, current_user)


@router.get("/vault/{item_id}", response_model=list[ShareLinkOut])
async def list_shares(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    return await svc.list_item_shares(item_id, current_user)


@router.delete("/{token}", status_code=204)
async def revoke_share(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    await svc.revoke_share(token, current_user)


# ── Public / semi-public resolve endpoints ────────────────────────────────────


@router.get("/resolve/{token}")
async def resolve_link(token: str, db: AsyncSession = Depends(get_db)):
    """
    Unauthenticated. Returns metadata only (is_strict, expired).
    Frontend uses this to decide whether to show login gate.
    """
    svc = _svc(db)
    return await svc.resolve_link_meta(token)


@router.get("/access/{token}", response_model=SharedItemResponse)
async def access_shared_item(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Authenticated access to a shared vault item."""
    svc = _svc(db)
    result = await svc.access_shared_item(token, current_user)

    item_data = result["item"]
    item_out = VaultItemOut(
        id=item_data["id"],
        owner_id=item_data["owner_id"],
        title=item_data["title"],
        description=item_data.get("description"),
        created_at=item_data["created_at"],
        updated_at=item_data["updated_at"],
        fields=[CredentialFieldOut(**f) for f in item_data["fields"]],
    )
    return SharedItemResponse(share=result["share"], item=item_out)
