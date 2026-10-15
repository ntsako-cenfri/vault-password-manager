import secrets
import string

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.services.audit_service import AuditService
from app.utils.security import hash_password

# No look-alike characters (0/O, 1/l/I) — the admin reads this out or pastes
# it to the user, so it has to survive being retyped by hand.
_TEMP_PW_ALPHABET = "".join(c for c in string.ascii_letters + string.digits if c not in "0O1lI")


def _generate_temp_password(length: int = 16) -> str:
    # Must also satisfy the normal strength rules (upper + digit), so retry
    # until it does — with 16 chars this almost always succeeds first time.
    while True:
        pw = "".join(secrets.choice(_TEMP_PW_ALPHABET) for _ in range(length))
        if any(c.isupper() for c in pw) and any(c.isdigit() for c in pw):
            return pw


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = UserRepository(db)
        self._audit = AuditService(db)

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

    async def admin_reset_password(self, admin: User, target_id: str) -> str:
        """Replace the user's password with a generated one-time password and
        force them through the change-password flow on their next login.
        Returns the plaintext once — it is never stored or retrievable again."""
        if admin.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
        target = await self._repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if str(target.id) == str(admin.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use Settings to change your own password",
            )
        temp_password = _generate_temp_password()
        target.hashed_password = hash_password(temp_password)
        target.must_change_password = True
        await self._repo.save(target)
        await self._audit.log(
            "user.password_reset_by_admin",
            actor_id=str(admin.id),
            actor_email=admin.email,
            resource_type="user",
            resource_id=str(target.id),
            detail=f"Temporary password issued for {target.email}",
        )
        return temp_password
