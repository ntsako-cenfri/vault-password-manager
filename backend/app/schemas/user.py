from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RoleUpdateRequest(BaseModel):
    role: str  # admin | team | external
