from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.vault_item import VaultItem
from app.models.credential_field import CredentialField


class VaultRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, item_id: str) -> VaultItem | None:
        result = await self._db.execute(
            select(VaultItem)
            .where(VaultItem.id == item_id)
            .options(selectinload(VaultItem.fields))
        )
        return result.scalar_one_or_none()

    async def list_by_owner(self, owner_id: str) -> list[VaultItem]:
        result = await self._db.execute(
            select(VaultItem)
            .where(VaultItem.owner_id == owner_id)
            .options(selectinload(VaultItem.fields))
            .order_by(VaultItem.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[VaultItem]:
        """Admin-only: returns every item."""
        result = await self._db.execute(
            select(VaultItem)
            .options(selectinload(VaultItem.fields))
            .order_by(VaultItem.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, **kwargs) -> VaultItem:
        item = VaultItem(**kwargs)
        self._db.add(item)
        await self._db.flush()
        await self._db.refresh(item)
        return item

    async def save(self, item: VaultItem) -> VaultItem:
        self._db.add(item)
        await self._db.flush()
        await self._db.refresh(item)
        return item

    async def delete(self, item: VaultItem) -> None:
        await self._db.delete(item)
        await self._db.flush()

    async def add_field(self, **kwargs) -> CredentialField:
        field = CredentialField(**kwargs)
        self._db.add(field)
        await self._db.flush()
        await self._db.refresh(field)
        return field

    async def delete_field(self, field: CredentialField) -> None:
        await self._db.delete(field)
        await self._db.flush()
