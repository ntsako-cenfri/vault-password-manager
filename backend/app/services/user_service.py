from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = UserRepository(db)

    async def list_users(self, requester: User) -> list[User]:
        # External users have no visibility into other users
        if requester.role == UserRole.external:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return await self._repo.list_all()

    async def assign_role(self, admin: User, target_id: str, new_role: str) -> User:
        if admin.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
        if new_role not in (r.value for r in UserRole):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

        target = await self._repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        target.role = new_role
        return await self._repo.save(target)

    async def toggle_active(self, admin: User, target_id: str) -> User:
        if admin.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
        target = await self._repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        # Prevent admin from disabling themselves
        if str(target.id) == str(admin.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot disable your own account"
            )
        target.is_active = not target.is_active
        return await self._repo.save(target)
