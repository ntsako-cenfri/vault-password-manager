"""Share link lifecycle: create, resolve, access-gate, revoke."""
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.share_link import ShareLink
from app.models.user import User, UserRole
from app.repositories.share_repository import ShareRepository
from app.repositories.vault_repository import VaultRepository
from app.schemas.share import ShareLinkCreate
from app.services.encryption_service import EncryptionService
from app.services.vault_service import VaultService


class ShareService:
    def __init__(self, db: AsyncSession, enc: EncryptionService) -> None:
        self._share_repo = ShareRepository(db)
        self._vault_repo = VaultRepository(db)
        self._vault_svc = VaultService(db, enc)

    # ── Create ────────────────────────────────────────────────────────────────

    async def create_share(
        self, item_id: str, data: ShareLinkCreate, user: User
    ) -> ShareLink:
        # Verify item exists and requester owns it (or is admin)
        item = await self._vault_repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if user.role != UserRole.admin and str(item.owner_id) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        return await self._share_repo.create(
            vault_item_id=item_id,
            created_by=user.id,
            recipient_email=data.recipient_email,
            is_strict=data.is_strict,
            expires_at=data.expires_at,
        )

    # ── Resolve (unauthenticated preview) ─────────────────────────────────────

    async def resolve_link_meta(self, token: str) -> dict:
        """Return minimal metadata (is_strict, expired) without revealing the item."""
        link = await self._share_repo.get_by_token(token)
        if not link:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found")
        return {
            "is_strict": link.is_strict,
            "expired": link.expires_at is not None and datetime.utcnow() > link.expires_at,
            "recipient_email": link.recipient_email,
        }

    # ── Access (authenticated) ────────────────────────────────────────────────

    async def access_shared_item(self, token: str, user: User) -> dict:
        link = await self._share_repo.get_by_token(token)
        if not link:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found")

        if link.expires_at and datetime.utcnow() > link.expires_at:
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="Share link has expired")

        # Strict mode: caller must be authenticated (already asserted by the router dependency)
        # Email-targeted: validate if recipient_email is set
        if link.recipient_email and link.recipient_email.lower() != user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This link was shared with a different email address",
            )

        # Record first access
        if link.accessed_by is None:
            link.accessed_by = user.id
            await self._share_repo.save(link)

        # Decrypt fields inline for the response
        item = link.vault_item
        decrypted_fields = self._vault_svc.decrypt_fields(item)

        return {
            "share": link,
            "item": {
                **{c.key: getattr(item, c.key) for c in item.__table__.columns},
                "fields": decrypted_fields,
            },
        }

    # ── List shares for an item ───────────────────────────────────────────────

    async def list_item_shares(self, item_id: str, user: User) -> list[ShareLink]:
        item = await self._vault_repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if user.role != UserRole.admin and str(item.owner_id) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return await self._share_repo.list_by_item(item_id)

    # ── Revoke ────────────────────────────────────────────────────────────────

    async def revoke_share(self, share_id: str, user: User) -> None:
        result = await self._share_repo.get_by_token(share_id)
        # accept both token and id
        if not result:
            from sqlalchemy import select
            from app.models.share_link import ShareLink as SL
            from sqlalchemy.ext.asyncio import AsyncSession
        link = result
        if not link:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share not found")
        item = await self._vault_repo.get_by_id(str(link.vault_item_id))
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if user.role != UserRole.admin and str(item.owner_id) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        await self._share_repo.delete(link)
