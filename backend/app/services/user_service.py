import re
import secrets
import string

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.services.audit_service import AuditService
from app.utils.security import hash_password

# No look-alike characters (0/O, 1/l/I) — the admin reads this out or pastes
# it to the user, so it has to survive being retyped by hand.
_TEMP_PW_ALPHABET = "".join(c for c in string.ascii_letters + string.digits if c not in "0O1lI")


def _generate_temp_password(length: int = 16) -> str:
    # Must also satisfy the normal strength rules (upper + digit), so retry
    # until it does — with 16 chars this almost always succeeds first time.
    while True:
        pw = "".join(secrets.choice(_TEMP_PW_ALPHABET) for _ in range(length))
        if any(c.isupper() for c in pw) and any(c.isdigit() for c in pw):
            return pw


# SFTP login names become Linux account + folder names, so keep them strict.
_SFTP_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{1,31}$")
_SFTP_RESERVED = {"root", "sshd", "daemon", "bin", "sys", "nobody", "operator", "guest", "ftp", "mail", "games", "shadow"}


def suggest_sftp_username(email: str) -> str:
    base = re.sub(r"[^a-z0-9_]", "", email.split("@")[0].lower()) or "user"
    if not base[0].isalpha():
        base = "u" + base
    if len(base) < 2:
        base += "x"
    return base[:32]


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = UserRepository(db)
        self._audit = AuditService(db)

    async def list_users(self, requester: User) -> list[User]:
        # External users have no visibility into other users
        if requester.role == UserRole.external:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return await self._repo.list_all()

    async def assign_role(self, admin: User, target_id: str, new_role: str) -> User:
        if admin.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
        if new_role not in (r.value for r in UserRole):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

        target = await self._repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        target.role = new_role
        return await self._repo.save(target)

    async def toggle_active(self, admin: User, target_id: str) -> User:
        if admin.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
        target = await self._repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        # Prevent admin from disabling themselves
        if str(target.id) == str(admin.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot disable your own account"
            )
        target.is_active = not target.is_active
        return await self._repo.save(target)

    async def admin_reset_password(self, admin: User, target_id: str) -> str:
        """Replace the user's password with a generated one-time password and
        force them through the change-password flow on their next login.
        Returns the plaintext once — it is never stored or retrievable again."""
        if admin.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
        target = await self._repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if str(target.id) == str(admin.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use Settings to change your own password",
            )
        temp_password = _generate_temp_password()
        target.hashed_password = hash_password(temp_password)
        target.must_change_password = True
        await self._repo.save(target)
        await self._audit.log(
            "user.password_reset_by_admin",
            actor_id=str(admin.id),
            actor_email=admin.email,
            resource_type="user",
            resource_id=str(target.id),
            detail=f"Temporary password issued for {target.email}",
        )
        return temp_password

    async def set_sftp_access(
        self, admin: User, target_id: str, enabled: bool, username: str | None
    ) -> User:
        """Switch public-SFTP access on/off for a user.

        On: record the SFTP username (first time only) and enable; the host-side sync creates
        the account and, only if it does not already exist, the folder.
        Off: disable only. The username is kept and no folder or file is ever deleted."""
        if admin.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
        target = await self._repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if enabled:
            wanted = (username or "").strip().lower() or None
            if target.sftp_username:
                if wanted and wanted != target.sftp_username:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"This user's SFTP username is already {target.sftp_username} "
                               "(their folder is named after it, so it cannot be changed)",
                    )
                name = target.sftp_username
            else:
                name = wanted or suggest_sftp_username(target.email)
                if not _SFTP_NAME_RE.match(name):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="SFTP username must be 2-32 characters: lowercase letters, digits or _, starting with a letter",
                    )
                if name in _SFTP_RESERVED:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"'{name}' is a reserved name")
                other = await self._repo.get_by_sftp_username(name)
                if other and other.id != target.id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"SFTP username '{name}' is already used by another user - choose a different one",
                    )
            target.sftp_username = name
            target.sftp_enabled = True
        else:
            target.sftp_enabled = False

        await self._repo.save(target)
        await self._audit.log(
            "user.sftp_enabled" if enabled else "user.sftp_disabled",
            actor_id=str(admin.id),
            actor_email=admin.email,
            resource_type="user",
            resource_id=str(target.id),
            detail=f"SFTP access {'enabled' if enabled else 'disabled'} for {target.email}"
                   + (f" as {target.sftp_username}" if target.sftp_username else ""),
        )
        return target

    async def set_vpn_access(self, admin: User, target_id: str, enabled: bool) -> User:
        """Switch VPN access on/off. Off only disables the user's VPN entry (done by the
        host-side vpn-sync job); the entry and its keys are kept for switching back on."""
        if admin.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
        target = await self._repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        target.vpn_enabled = enabled
        await self._repo.save(target)
        await self._audit.log(
            "user.vpn_enabled" if enabled else "user.vpn_disabled",
            actor_id=str(admin.id),
            actor_email=admin.email,
            resource_type="user",
            resource_id=str(target.id),
            detail=f"VPN access {'enabled' if enabled else 'disabled'} for {target.email}",
        )
        return target

    async def get_vpn_config(self, admin: User, target_id: str, enc) -> dict:
        """Admin only: decrypt the user's VPN setup (config + QR) so it can be sent to them."""
        if admin.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
        target = await self._repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if not (target.vpn_enabled and target.vpn_config_enc and target.vpn_config_key):
            return {"ready": False}
        config = enc.decrypt_value(target.vpn_config_enc, target.vpn_config_key)
        qr = enc.decrypt_value(target.vpn_qr_enc, target.vpn_config_key) if target.vpn_qr_enc else None
        await self._audit.log(
            "user.vpn_config_viewed",
            actor_id=str(admin.id),
            actor_email=admin.email,
            resource_type="user",
            resource_id=str(target.id),
            detail=f"VPN setup viewed for {target.email}",
        )
        base = re.sub(r"[^A-Za-z0-9_-]", "", (target.sftp_username or target.email.split("@")[0]))[:24] or "vault"
        return {"ready": True, "filename": f"cenfri-{base}.conf", "config": config, "qr_svg": qr}
