from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.schemas.vault import VaultItemOut


class ShareLinkCreate(BaseModel):
    recipient_email: Optional[EmailStr] = None
    is_strict: bool = True
    expires_at: Optional[datetime] = None


class ShareLinkOut(BaseModel):
    id: UUID
    token: str
    vault_item_id: UUID
    recipient_email: Optional[str] = None
    is_strict: bool
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SharedItemResponse(BaseModel):
    share: ShareLinkOut
    item: VaultItemOut
