from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.item_grant import ItemGrant
from app.models.vault_item import VaultItem


class GrantRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def has_grant(self, item_id: str, user_id: str) -> bool:
        result = await self._db.execute(
            select(ItemGrant).where(
                ItemGrant.vault_item_id == item_id,
                ItemGrant.granted_to_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def list_by_grantee(self, user_id: str) -> list[ItemGrant]:
        result = await self._db.execute(
            select(ItemGrant)
            .where(ItemGrant.granted_to_id == user_id)
            .options(
                selectinload(ItemGrant.vault_item).selectinload(VaultItem.fields),
                selectinload(ItemGrant.grantor),
            )
            .order_by(ItemGrant.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_by_item(self, item_id: str) -> list[ItemGrant]:
        result = await self._db.execute(
            select(ItemGrant)
            .where(ItemGrant.vault_item_id == item_id)
            .options(selectinload(ItemGrant.grantee))
            .order_by(ItemGrant.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, grant_id: str) -> ItemGrant | None:
        result = await self._db.execute(
            select(ItemGrant).where(ItemGrant.id == grant_id)
        )
        return result.scalar_one_or_none()

    async def find_by_item_and_email(self, item_id: str, email: str) -> ItemGrant | None:
        result = await self._db.execute(
            select(ItemGrant).where(
                ItemGrant.vault_item_id == item_id,
                func.lower(ItemGrant.granted_to_email) == email.lower(),
            )
        )
        return result.scalar_one_or_none()

    async def list_pending_by_email(self, email: str) -> list[ItemGrant]:
        """Grants with no linked user yet — activated on registration."""
        result = await self._db.execute(
            select(ItemGrant).where(
                func.lower(ItemGrant.granted_to_email) == email.lower(),
                ItemGrant.granted_to_id.is_(None),
            )
        )
        return list(result.scalars().all())

    async def create(self, **kwargs) -> ItemGrant:
        grant = ItemGrant(**kwargs)
        self._db.add(grant)
        await self._db.flush()
        await self._db.refresh(grant)
        return grant

    async def save(self, grant: ItemGrant) -> ItemGrant:
        self._db.add(grant)
        await self._db.flush()
        await self._db.refresh(grant)
        return grant

    async def delete(self, grant: ItemGrant) -> None:
        await self._db.delete(grant)
        await self._db.flush()
