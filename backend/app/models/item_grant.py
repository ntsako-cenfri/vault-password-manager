import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.guid import GUID


class ItemGrant(Base):
    """Persistent access grant – survives share-link expiry.

    ``granted_to_id`` is NULL for pre-registration grants (email not yet
    registered). When the matching user registers we fill it in.
    """

    __tablename__ = "item_grants"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    vault_item_id = Column(GUID, ForeignKey("vault_items.id", ondelete="CASCADE"), nullable=False)
    granted_by = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    granted_to_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    granted_to_email = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vault_item = relationship("VaultItem", back_populates="grants")
    grantor = relationship("User", foreign_keys=[granted_by])
    grantee = relationship("User", foreign_keys=[granted_to_id])
