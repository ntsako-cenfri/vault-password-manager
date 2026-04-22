import enum
import uuid

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.guid import GUID


class FieldType(str, enum.Enum):
    username = "username"
    password = "password"
    ssh_key = "ssh_key"
    pem_file = "pem_file"
    install_file = "install_file"
    url = "url"
    api_key = "api_key"
    note = "note"
    custom = "custom"
    db_host = "db_host"
    db_username = "db_username"
    db_port = "db_port"
    db_password = "db_password"
    custom_file = "custom_file"


class CredentialField(Base):
    __tablename__ = "credential_fields"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    vault_item_id = Column(GUID, ForeignKey("vault_items.id", ondelete="CASCADE"), nullable=False)
    field_type = Column(String, nullable=False)
    label = Column(String, nullable=False)
    # Text-based fields — encrypted with the parent item's key
    encrypted_value = Column(Text)
    # File-based fields — path on disk (file content itself is encrypted)
    file_path = Column(String)
    original_filename = Column(String)
    # Human-readable notes / action comments for this field
    comment = Column(Text)
    order = Column(Integer, default=0, nullable=False)

    vault_item = relationship("VaultItem", back_populates="fields")
