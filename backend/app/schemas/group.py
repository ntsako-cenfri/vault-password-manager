from datetime import datetime

from pydantic import BaseModel


class GroupCreate(BaseModel):
    name: str


class GroupOut(BaseModel):
    id: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}
