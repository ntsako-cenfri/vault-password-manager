from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item_grant import ItemGrant
from app.models.user import User, UserRole
from app.repositories.grant_repository import GrantRepository
from app.repositories.user_repository import UserRepository
from app.repositories.vault_repository import VaultRepository


class GrantService:
    def __init__(self, db: AsyncSession) -> None:
        self._vault_repo = VaultRepository(db)
        self._grant_repo = GrantRepository(db)
        self._user_repo = UserRepository(db)

    async def grant_access(self, item_id: str, email: str, requester: User) -> ItemGrant:
        email = email.lower().strip()
        item = await self._vault_repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if str(item.owner_id) != str(requester.id) and requester.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the item owner can grant access")
        # Prevent granting to self
        existing_owner = await self._user_repo.get_by_email(email)
        if existing_owner and str(existing_owner.id) == str(item.owner_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner already has access")
        # Idempotent – return existing grant
        existing = await self._grant_repo.find_by_item_and_email(item_id, email)
        if existing:
            # If it exists but granted_to_id is still null, try to resolve the user now
            if existing.granted_to_id is None:
                target_user = await self._user_repo.get_by_email(email)
                if target_user:
                    existing.granted_to_id = target_user.id
                    await self._grant_repo.save(existing)
            return existing
        target_user = await self._user_repo.get_by_email(email)
        return await self._grant_repo.create(
            vault_item_id=item.id,
            granted_by=requester.id,
            granted_to_id=target_user.id if target_user else None,
            granted_to_email=email,
        )

    async def list_item_grants(self, item_id: str, requester: User) -> list[ItemGrant]:
        item = await self._vault_repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if str(item.owner_id) != str(requester.id) and requester.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return await self._grant_repo.list_by_item(item_id)

    async def revoke_grant(self, item_id: str, grant_id: str, requester: User) -> None:
        item = await self._vault_repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if str(item.owner_id) != str(requester.id) and requester.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        grant = await self._grant_repo.get_by_id(grant_id)
        if not grant or str(grant.vault_item_id) != item_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grant not found")
        await self._grant_repo.delete(grant)
