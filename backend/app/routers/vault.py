from fastapi import APIRouter, Depends, Form, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.vault import CredentialFieldIn, VaultItemCreate, VaultItemOut, VaultItemUpdate
from app.services.encryption_service import EncryptionService
from app.services.vault_service import VaultService
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/vault", tags=["vault"])

_enc = EncryptionService(settings.master_encryption_key)


def _svc(db: AsyncSession) -> VaultService:
    return VaultService(db, _enc)


@router.get("", response_model=list[VaultItemOut])
async def list_items(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    items = await svc.list_items(current_user)
    return [_build_item_out(item, svc) for item in items]


@router.post("", response_model=VaultItemOut, status_code=201)
async def create_item(
    body: VaultItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    item = await svc.create_item(body, current_user)
    return _build_item_out(item, svc)


@router.get("/{item_id}", response_model=VaultItemOut)
async def get_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    item = await svc.get_item(item_id, current_user)
    return _build_item_out(item, svc)


@router.patch("/{item_id}", response_model=VaultItemOut)
async def update_item(
    item_id: str,
    body: VaultItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    item = await svc.update_item(item_id, body, current_user)
    return _build_item_out(item, svc)


@router.delete("/{item_id}", status_code=204)
async def delete_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    await svc.delete_item(item_id, current_user)


# ── Fields ────────────────────────────────────────────────────────────────────


@router.post("/{item_id}/fields", status_code=201)
async def add_field(
    item_id: str,
    body: CredentialFieldIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    return await svc.add_text_field(item_id, body, current_user)


@router.post("/{item_id}/fields/upload", status_code=201)
async def upload_field(
    item_id: str,
    field_type: str = Form(...),
    label: str = Form(...),
    comment: str | None = Form(None),
    order: int = Form(0),
    file: UploadFile = ...,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    return await svc.upload_file_field(item_id, field_type, label, comment, order, file, current_user)


@router.get("/{item_id}/fields/{field_id}/download")
async def download_field(
    item_id: str,
    field_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    content, filename = await svc.read_file_field(item_id, field_id, current_user)
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{item_id}/fields/{field_id}", status_code=204)
async def delete_field(
    item_id: str,
    field_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db)
    await svc.delete_field(item_id, field_id, current_user)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _build_item_out(item, svc: VaultService) -> VaultItemOut:
    """Produce a VaultItemOut with decrypted field values."""
    from app.schemas.vault import CredentialFieldOut

    decrypted = svc.decrypt_fields(item)
    return VaultItemOut(
        id=item.id,
        owner_id=item.owner_id,
        title=item.title,
        description=item.description,
        created_at=item.created_at,
        updated_at=item.updated_at,
        fields=[CredentialFieldOut(**f) for f in decrypted],
    )
