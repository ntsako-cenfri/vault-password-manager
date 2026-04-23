from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.schemas.vault import VaultItemOut


class GrantAccessRequest(BaseModel):
    email: EmailStr


class ItemGrantOut(BaseModel):
    id: UUID
    vault_item_id: UUID
    granted_by: UUID
    granted_to_id: Optional[UUID] = None
    granted_to_email: str
    grantor_username: str
    grantee_username: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GrantedItemOut(BaseModel):
    grant_id: UUID
    granted_by_username: str
    item: VaultItemOut


class UserVaultResponse(BaseModel):
    own_items: list[VaultItemOut]
    shared_items: list[GrantedItemOut]
