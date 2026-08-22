from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import Group


class GroupRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_by_owner(self, owner_id: str) -> list[Group]:
        result = await self._db.execute(
            select(Group).where(Group.owner_id == owner_id).order_by(Group.name)
        )
        return list(result.scalars().all())

    async def get_by_name(self, owner_id: str, name: str) -> Group | None:
        result = await self._db.execute(
            select(Group).where(Group.owner_id == owner_id, Group.name == name)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, group_id: str) -> Group | None:
        result = await self._db.execute(select(Group).where(Group.id == group_id))
        return result.scalar_one_or_none()

    async def create(self, owner_id: str, name: str) -> Group:
        group = Group(owner_id=owner_id, name=name)
        self._db.add(group)
        await self._db.flush()
        await self._db.refresh(group)
        return group

    async def delete(self, group: Group) -> None:
        await self._db.delete(group)
        await self._db.flush()
