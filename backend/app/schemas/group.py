from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class GroupCreate(BaseModel):
    name: str


class GroupOut(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}
