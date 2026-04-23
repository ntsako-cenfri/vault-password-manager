from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.grant import GrantAccessRequest, GrantedItemOut, ItemGrantOut
from app.schemas.share import ShareLinkCreate, ShareLinkOut, SharedItemResponse
from app.schemas.vault import CredentialFieldOut, VaultItemOut
from app.services.encryption_service import EncryptionService
from app.services.grant_service import GrantService
from app.services.share_service import ShareService
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/shares", tags=["shares"])

_enc = EncryptionService(settings.master_encryption_key)


def _svc(db: AsyncSession) -> ShareService:
    return ShareService(db, _enc)


def _grant_svc(db: AsyncSession) -> GrantService:
    return GrantService(db)


# ── Direct grants ─────────────────────────────────────────────────────────────


@router.post("/vault/{item_id}/grant", response_model=ItemGrantOut, status_code=201)
async def grant_access(
    item_id: str,
    body: GrantAccessRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Grant persistent access to an item by email (works for future registrations too)."""
    svc = _grant_svc(db)
    grant = await svc.grant_access(item_id, body.email, current_user)
    return ItemGrantOut(
        id=grant.id,
        vault_item_id=grant.vault_item_id,
        granted_by=grant.granted_by,
        granted_to_id=grant.granted_to_id,
        granted_to_email=grant.granted_to_email,
        grantor_username=grant.grantor.username if grant.grantor else "",
        grantee_username=grant.grantee.username if grant.grantee else None,
        created_at=grant.created_at,
    )


@router.get("/vault/{item_id}/grants", response_model=list[ItemGrantOut])
async def list_grants(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _grant_svc(db)
    grants = await svc.list_item_grants(item_id, current_user)
    return [
        ItemGrantOut(
            id=g.id,
            vault_item_id=g.vault_item_id,
            granted_by=g.granted_by,
            granted_to_id=g.granted_to_id,
            granted_to_email=g.granted_to_email,
            grantor_username=g.grantor.username if g.grantor else "",
            grantee_username=g.grantee.username if g.grantee else None,
            created_at=g.created_at,
        )
        for g in grants
    ]


@router.delete("/vault/{item_id}/grant/{grant_id}", status_code=204)
async def revoke_grant(
    item_id: str,
    grant_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _grant_svc(db)
    await svc.revoke_grant(item_id, grant_id, current_user)


# ── Share links ───────────────────────────────────────────────────────────────


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
