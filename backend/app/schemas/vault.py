from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CredentialFieldIn(BaseModel):
    field_type: str
    label: str
    value: Optional[str] = None  # None for file-type fields (uploaded separately)
    comment: Optional[str] = None
    order: int = 0


class CredentialFieldOut(BaseModel):
    id: UUID
    field_type: str
    label: str
    value: Optional[str] = None  # decrypted at response time
    comment: Optional[str] = None
    original_filename: Optional[str] = None
    order: int

    model_config = {"from_attributes": True}


class VaultItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    fields: list[CredentialFieldIn] = []


class VaultItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class VaultItemOut(BaseModel):
    id: UUID
    owner_id: UUID
    title: str
    description: Optional[str] = None
    fields: list[CredentialFieldOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
