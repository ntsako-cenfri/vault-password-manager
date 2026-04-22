import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.guid import GUID


class VaultItem(Base):
    __tablename__ = "vault_items"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    owner_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    # Per-item AES key, wrapped (encrypted) with the master key
    item_key = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    owner = relationship("User", back_populates="vault_items")
    fields = relationship(
        "CredentialField",
        back_populates="vault_item",
        cascade="all, delete-orphan",
        order_by="CredentialField.order",
    )
    share_links = relationship(
        "ShareLink", back_populates="vault_item", cascade="all, delete-orphan"
    )
