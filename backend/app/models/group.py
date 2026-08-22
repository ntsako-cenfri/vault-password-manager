import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.guid import GUID


class Group(Base):
    """A named group a user has created to file vault items under.

    Deliberately just (owner_id, name) — no hierarchy, no color, nothing
    fancier than what's needed to let a group exist before any item uses it.
    vault_items.category stays a plain string; this table is the
    authoritative "groups I've created" list so an empty group still shows
    up in the sidebar. Creating an item with a brand-new category name
    auto-registers a matching row here (see VaultService/routers/vault.py)
    so the two never drift out of sync.
    """

    __tablename__ = "groups"
    __table_args__ = (UniqueConstraint("owner_id", "name", name="uq_groups_owner_name"),)

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    owner_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User")
