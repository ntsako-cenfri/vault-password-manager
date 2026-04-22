from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self._db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self._db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self._db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def list_all(self) -> list[User]:
        result = await self._db.execute(select(User).order_by(User.created_at))
        return list(result.scalars().all())

    async def admin_count(self) -> int:
        result = await self._db.execute(
            select(func.count()).where(User.role == UserRole.admin)
        )
        return result.scalar_one()

    async def create(self, **kwargs) -> User:
        user = User(**kwargs)
        self._db.add(user)
        await self._db.flush()
        await self._db.refresh(user)
        return user

    async def save(self, user: User) -> User:
        self._db.add(user)
        await self._db.flush()
        await self._db.refresh(user)
        return user
