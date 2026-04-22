from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.share_link import ShareLink
from app.models.vault_item import VaultItem


class ShareRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_token(self, token: str) -> ShareLink | None:
        result = await self._db.execute(
            select(ShareLink)
            .where(ShareLink.token == token)
            .options(
                selectinload(ShareLink.vault_item).selectinload(VaultItem.fields)
            )
        )
        return result.scalar_one_or_none()

    async def list_by_item(self, vault_item_id: str) -> list[ShareLink]:
        result = await self._db.execute(
            select(ShareLink)
            .where(ShareLink.vault_item_id == vault_item_id)
            .order_by(ShareLink.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, **kwargs) -> ShareLink:
        link = ShareLink(**kwargs)
        self._db.add(link)
        await self._db.flush()
        await self._db.refresh(link)
        return link

    async def save(self, link: ShareLink) -> ShareLink:
        self._db.add(link)
        await self._db.flush()
        await self._db.refresh(link)
        return link

    async def delete(self, link: ShareLink) -> None:
        await self._db.delete(link)
        await self._db.flush()
