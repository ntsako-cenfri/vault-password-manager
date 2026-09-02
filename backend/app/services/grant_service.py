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
        is_owner_or_admin = str(item.owner_id) == str(requester.id) or requester.role == UserRole.admin
        if not is_owner_or_admin:
            # Not the owner/admin — but anyone an item has been shared *to* may
            # reshare it onward to someone else. They still can't revoke other
            # people's access or the owner's original grant (see revoke_grant
            # below), this only lets access spread further, not be taken away.
            has_grant = await self._grant_repo.has_grant(item_id, str(requester.id))
            if not has_grant:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this item")
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
                    existing = await self._grant_repo.save(existing)
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
        is_owner_or_admin = str(item.owner_id) == str(requester.id) or requester.role == UserRole.admin
        if not is_owner_or_admin:
            has_grant = await self._grant_repo.has_grant(item_id, str(requester.id))
            if not has_grant:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return await self._grant_repo.list_by_item(item_id)

    async def revoke_grant(self, item_id: str, grant_id: str, requester: User) -> None:
        item = await self._vault_repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        grant = await self._grant_repo.get_by_id(grant_id)
        if not grant or str(grant.vault_item_id) != item_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grant not found")
        is_owner_or_admin = str(item.owner_id) == str(requester.id) or requester.role == UserRole.admin
        # A resharer may undo a grant *they* personally created, but not the
        # owner's original grants or anyone else's reshares — only the owner
        # or an admin can revoke those.
        is_own_reshare = str(grant.granted_by) == str(requester.id)
        # The grantee themself may always unshare — remove their own access —
        # regardless of who created the grant. This is distinct from write
        # access (see VaultService._assert_write_access): a grantee can never
        # delete the underlying item, but they can always walk away from a
        # share that was extended to them.
        is_grantee_self_unshare = (
            grant.granted_to_id is not None and str(grant.granted_to_id) == str(requester.id)
        )
        if not is_owner_or_admin and not is_own_reshare and not is_grantee_self_unshare:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        await self._grant_repo.delete(grant)
