"""Host-side helper for the vpn-sync job (run with: python -m app.cli_vpn <command>).

  list   -> JSON list of users with their VPN state (no secrets)
  store  <- JSON on stdin: {"user_id", "client_id", "config"?, "qr_svg"?}
            links the user to a wg-easy client and stores the setup encrypted
  unlink <- JSON on stdin: {"user_id"}  forget a client that no longer exists in wg-easy
Only the vpn-sync job uses this; it is not reachable over HTTP.
"""
import asyncio
import importlib
import json
import pkgutil
import sys

import app.models as _models

for _m in pkgutil.iter_modules(_models.__path__):
    importlib.import_module(f"app.models.{_m.name}")

from sqlalchemy import select  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import AsyncSessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.audit_service import AuditService  # noqa: E402
from app.services.encryption_service import EncryptionService  # noqa: E402


async def cmd_list(session_factory=AsyncSessionLocal) -> list[dict]:
    async with session_factory() as db:
        users = (await db.execute(select(User))).scalars().all()
        return [
            {
                "id": str(u.id), "email": u.email, "username": u.username, "is_active": u.is_active,
                "vpn_enabled": u.vpn_enabled, "vpn_client_id": u.vpn_client_id, "vpn_ready": u.vpn_ready,
            }
            for u in users
        ]


async def cmd_store(req: dict, session_factory=AsyncSessionLocal, enc: EncryptionService | None = None) -> dict:
    enc = enc or EncryptionService(settings.master_encryption_key)
    async with session_factory() as db:
        u = (await db.execute(select(User).where(User.id == req["user_id"]))).scalar_one_or_none()
        if u is None:
            return {"ok": False, "error": "user not found"}
        u.vpn_client_id = int(req["client_id"])
        if req.get("config"):
            if not u.vpn_config_key:
                u.vpn_config_key = enc.generate_item_key()
            u.vpn_config_enc = enc.encrypt_value(req["config"], u.vpn_config_key)
            u.vpn_qr_enc = enc.encrypt_value(req["qr_svg"], u.vpn_config_key) if req.get("qr_svg") else None
        db.add(u)
        await db.flush()
        await AuditService(db).log(           # commits the change together with the audit line
            "user.vpn_client_linked", actor_email="vpn-sync (server)", resource_type="user",
            resource_id=str(u.id), detail=f"wg-easy client {u.vpn_client_id} for {u.email}",
        )
        return {"ok": True}


async def cmd_unlink(req: dict, session_factory=AsyncSessionLocal) -> dict:
    async with session_factory() as db:
        u = (await db.execute(select(User).where(User.id == req["user_id"]))).scalar_one_or_none()
        if u is None:
            return {"ok": False, "error": "user not found"}
        u.vpn_client_id = None
        u.vpn_config_key = u.vpn_config_enc = u.vpn_qr_enc = None
        db.add(u)
        await db.flush()
        await AuditService(db).log(
            "user.vpn_client_unlinked", actor_email="vpn-sync (server)", resource_type="user",
            resource_id=str(u.id), detail=f"wg-easy client no longer exists for {u.email}",
        )
        return {"ok": True}


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "list":
        print(json.dumps(asyncio.run(cmd_list())))
    elif cmd == "store":
        print(json.dumps(asyncio.run(cmd_store(json.loads(sys.stdin.read())))))
    elif cmd == "unlink":
        print(json.dumps(asyncio.run(cmd_unlink(json.loads(sys.stdin.read())))))
    else:
        print("usage: python -m app.cli_vpn list|store|unlink", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
