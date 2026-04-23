"""Vault item CRUD + credential field management + file handling."""
import os
import uuid

import aiofiles
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.credential_field import FieldType
from app.models.user import User, UserRole
from app.models.vault_item import VaultItem
from app.repositories.grant_repository import GrantRepository
from app.repositories.vault_repository import VaultRepository
from app.schemas.vault import CredentialFieldIn, VaultItemCreate, VaultItemUpdate
from app.services.encryption_service import EncryptionService

_FILE_TYPES = {FieldType.pem_file, FieldType.install_file, FieldType.ssh_key, FieldType.custom_file}


class VaultService:
    def __init__(self, db: AsyncSession, enc: EncryptionService) -> None:
        self._repo = VaultRepository(db)
        self._enc = enc
        self._grant_repo = GrantRepository(db)

    # ── Listing ───────────────────────────────────────────────────────────────

    async def list_items(self, user: User) -> list[VaultItem]:
        # Always return only the caller's own items — admins see other users' items
        # via the dedicated /users/{id}/vault oversight endpoint, not their own vault list.
        return await self._repo.list_by_owner(str(user.id))

    # ── Fetch single ─────────────────────────────────────────────────────────

    async def get_item(self, item_id: str, user: User) -> VaultItem:
        item = await self._repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if user.role != UserRole.admin and str(item.owner_id) != str(user.id):
            has_grant = await self._grant_repo.has_grant(str(item.id), str(user.id))
            if not has_grant:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return item

    # ── Shared items (granted to user) ────────────────────────────────────────

    async def list_shared_items(self, user: User) -> list[tuple]:
        """Returns (ItemGrant, VaultItem) pairs for items granted to user."""
        grants = await self._grant_repo.list_by_grantee(str(user.id))
        return [(g, g.vault_item) for g in grants if g.vault_item]

    async def list_shared_items_for_user_id(self, user_id: str) -> list[tuple]:
        """Admin: same as above but for any user id."""
        grants = await self._grant_repo.list_by_grantee(user_id)
        return [(g, g.vault_item) for g in grants if g.vault_item]

    # ── Create ────────────────────────────────────────────────────────────────

    async def create_item(self, data: VaultItemCreate, user: User) -> VaultItem:
        item_key = self._enc.generate_item_key()
        item = await self._repo.create(
            owner_id=user.id,
            title=data.title,
            description=data.description,
            item_key=item_key,
        )
        for field_data in data.fields:
            await self._add_field(item, field_data)
        # Re-fetch with relations
        return await self._repo.get_by_id(str(item.id))  # type: ignore[return-value]

    # ── Update item metadata ──────────────────────────────────────────────────

    async def update_item(self, item_id: str, data: VaultItemUpdate, user: User) -> VaultItem:
        item = await self.get_item(item_id, user)
        self._assert_write_access(item, user)
        if data.title is not None:
            item.title = data.title
        if data.description is not None:
            item.description = data.description
        return await self._repo.save(item)

    # ── Delete item ───────────────────────────────────────────────────────────

    async def delete_item(self, item_id: str, user: User) -> None:
        item = await self.get_item(item_id, user)
        self._assert_write_access(item, user)
        # Remove encrypted files from disk
        for field in item.fields:
            if field.file_path and os.path.exists(field.file_path):
                os.remove(field.file_path)
        await self._repo.delete(item)

    # ── Add credential field (text) ───────────────────────────────────────────

    async def add_text_field(
        self, item_id: str, field_data: CredentialFieldIn, user: User
    ):
        item = await self.get_item(item_id, user)
        self._assert_write_access(item, user)
        return await self._add_field(item, field_data)

    # ── Upload file field ─────────────────────────────────────────────────────

    async def upload_file_field(
        self,
        item_id: str,
        field_type: str,
        label: str,
        comment: str | None,
        order: int,
        file: UploadFile,
        user: User,
    ):
        if field_type not in (ft.value for ft in _FILE_TYPES):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"field_type must be one of: {[ft.value for ft in _FILE_TYPES]}",
            )
        item = await self.get_item(item_id, user)
        self._assert_write_access(item, user)

        max_bytes = settings.max_file_size_mb * 1024 * 1024
        raw = await file.read(max_bytes + 1)
        if len(raw) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds {settings.max_file_size_mb} MB limit",
            )

        encrypted = self._enc.encrypt_file(raw, item.item_key)
        safe_name = f"{uuid.uuid4()}.enc"
        dest = os.path.join(settings.upload_dir, safe_name)
        os.makedirs(settings.upload_dir, exist_ok=True)

        async with aiofiles.open(dest, "wb") as f:
            await f.write(encrypted)

        return await self._repo.add_field(
            vault_item_id=item.id,
            field_type=field_type,
            label=label,
            comment=comment,
            order=order,
            file_path=dest,
            original_filename=file.filename,
        )

    # ── Download file field ───────────────────────────────────────────────────

    async def read_file_field(self, item_id: str, field_id: str, user: User) -> tuple[bytes, str]:
        item = await self.get_item(item_id, user)
        field = next((f for f in item.fields if str(f.id) == field_id), None)
        if not field or not field.file_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        async with aiofiles.open(field.file_path, "rb") as f:
            encrypted = await f.read()
        return self._enc.decrypt_file(encrypted, item.item_key), field.original_filename or "file"

    # ── Delete field ──────────────────────────────────────────────────────────

    async def delete_field(self, item_id: str, field_id: str, user: User) -> None:
        item = await self.get_item(item_id, user)
        self._assert_write_access(item, user)
        field = next((f for f in item.fields if str(f.id) == field_id), None)
        if not field:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
        if field.file_path and os.path.exists(field.file_path):
            os.remove(field.file_path)
        await self._repo.delete_field(field)

    # ── Decrypt fields for response ───────────────────────────────────────────

    def decrypt_fields(self, item: VaultItem) -> list[dict]:
        out = []
        for f in item.fields:
            data: dict = {
                "id": f.id,
                "field_type": f.field_type,
                "label": f.label,
                "comment": f.comment,
                "order": f.order,
                "original_filename": f.original_filename,
                "value": None,
            }
            if f.encrypted_value:
                try:
                    data["value"] = self._enc.decrypt_value(f.encrypted_value, item.item_key)
                except Exception:
                    data["value"] = "[decryption error]"
            out.append(data)
        return out

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _add_field(self, item: VaultItem, field_data: CredentialFieldIn):
        encrypted_value = None
        if field_data.value:
            encrypted_value = self._enc.encrypt_value(field_data.value, item.item_key)
        return await self._repo.add_field(
            vault_item_id=item.id,
            field_type=field_data.field_type,
            label=field_data.label,
            encrypted_value=encrypted_value,
            comment=field_data.comment,
            order=field_data.order,
        )

    def _assert_write_access(self, item: VaultItem, user: User) -> None:
        """Grants give read-only access — only owner or admin can write."""
        if user.role == UserRole.admin:
            return
        if str(item.owner_id) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
