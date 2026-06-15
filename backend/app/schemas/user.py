from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    role: str
    is_active: bool
    totp_enabled: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class RoleUpdateRequest(BaseModel):
    role: str  # admin | team | external


class InviteRequest(BaseModel):
    emails: list[EmailStr]


class InviteOut(BaseModel):
    email: str
    token: str
    invite_link: str
    expires_in_days: int = 7
