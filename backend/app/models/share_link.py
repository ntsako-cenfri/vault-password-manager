import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.guid import GUID


class ShareLink(Base):
    __tablename__ = "share_links"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    vault_item_id = Column(GUID, ForeignKey("vault_items.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    # Optional — targeted share to a specific email
    recipient_email = Column(String)
    # Strict = recipient must be authenticated to view
    is_strict = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime)
    # Recorded once the link is successfully accessed
    accessed_by = Column(GUID, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vault_item = relationship("VaultItem", back_populates="share_links")
    creator = relationship("User", foreign_keys=[created_by])
    accessor = relationship("User", foreign_keys=[accessed_by])
