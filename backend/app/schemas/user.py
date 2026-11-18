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
    must_change_password: bool = False
    sftp_enabled: bool = False
    sftp_username: str | None = None
    vpn_enabled: bool = False
    vpn_ready: bool = False
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


class AdminPasswordResetOut(BaseModel):
    temporary_password: str


class SftpAccessRequest(BaseModel):
    enabled: bool
    # Only used the first time access is enabled; blank = derive from the e-mail address.
    username: str | None = None


class VpnAccessRequest(BaseModel):
    enabled: bool


class VpnConfigOut(BaseModel):
    ready: bool
    filename: str | None = None
    config: str | None = None    # wg-quick config text (contains the private key)
    qr_svg: str | None = None    # QR code of the same config
