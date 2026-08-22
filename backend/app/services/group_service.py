from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import Group
from app.models.user import User
from app.repositories.group_repository import GroupRepository


class GroupService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = GroupRepository(db)

    async def list_groups(self, user: User) -> list[Group]:
        return await self._repo.list_by_owner(str(user.id))

    async def create_group(self, name: str, user: User) -> Group:
        name = name.strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group name is required")
        existing = await self._repo.get_by_name(str(user.id), name)
        if existing:
            # Idempotent — creating an already-existing name just hands it back
            # rather than erroring, since the UI can't always tell in advance.
            return existing
        return await self._repo.create(str(user.id), name)

    async def ensure_group(self, name: str | None, user: User) -> None:
        """Best-effort registration for a category typed directly on an item,
        so it shows up in the sidebar/group list even without a separate
        explicit "create group" action. Never raises."""
        if not name:
            return
        name = name.strip()
        if not name:
            return
        existing = await self._repo.get_by_name(str(user.id), name)
        if not existing:
            await self._repo.create(str(user.id), name)

    async def delete_group(self, group_id: str, user: User) -> None:
        group = await self._repo.get_by_id(group_id)
        if not group or str(group.owner_id) != str(user.id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
        await self._repo.delete(group)
