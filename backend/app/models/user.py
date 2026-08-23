import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.guid import GUID


class UserRole(str, enum.Enum):
    admin = "admin"
    team = "team"
    external = "external"


class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.external, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    totp_secret = Column(String, nullable=True)
    totp_enabled = Column(Boolean, default=False, nullable=False)
    # Set on a password rotation done on the user's behalf (e.g. a mass reset) —
    # forces them through the one-time change-password flow on next login,
    # instead of just handing them a working permanent password blind.
    must_change_password = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    vault_items = relationship("VaultItem", back_populates="owner", cascade="all, delete-orphan")
