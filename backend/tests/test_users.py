"""User management tests — role assignment, visibility, active toggle."""
import pytest
from httpx import AsyncClient

from tests.conftest import create_admin, login, register_user


@pytest.mark.asyncio
async def test_admin_can_list_users(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    resp = await client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_team_can_list_users(client: AsyncClient):
    await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    user = await register_user(client, "team@vault.io", "teamuser")
    # Promote to team
    await client.patch(
        f"/api/users/{user['id']}/role",
        json={"role": "team"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    team_token = await login(client, "team@vault.io", "UserPass1!")
    resp = await client.get("/api/users", headers={"Authorization": f"Bearer {team_token}"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_external_cannot_list_users(client: AsyncClient):
    await create_admin(client)
    await register_user(client, "ext@vault.io", "extuser")
    token = await login(client, "ext@vault.io", "UserPass1!")
    resp = await client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_assigns_role(client: AsyncClient):
    await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    user = await register_user(client, "promote@vault.io", "promoteuser")
    resp = await client.patch(
        f"/api/users/{user['id']}/role",
        json={"role": "team"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "team"


@pytest.mark.asyncio
async def test_non_admin_cannot_assign_role(client: AsyncClient):
    await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    user1 = await register_user(client, "u1@vault.io", "user1")
    user2 = await register_user(client, "u2@vault.io", "user2")
    # Promote user1 to team
    await client.patch(
        f"/api/users/{user1['id']}/role",
        json={"role": "team"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    team_token = await login(client, "u1@vault.io", "UserPass1!")
    resp = await client.patch(
        f"/api/users/{user2['id']}/role",
        json={"role": "admin"},
        headers={"Authorization": f"Bearer {team_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_assign_invalid_role(client: AsyncClient):
    await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    user = await register_user(client, "u@vault.io", "uuu")
    resp = await client.patch(
        f"/api/users/{user['id']}/role",
        json={"role": "superuser"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_admin_toggle_active(client: AsyncClient):
    await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    user = await register_user(client, "toggle@vault.io", "toggleuser")
    resp = await client.patch(
        f"/api/users/{user['id']}/toggle-active",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


@pytest.mark.asyncio
async def test_admin_cannot_disable_self(client: AsyncClient):
    admin = await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    resp = await client.patch(
        f"/api/users/{admin['id']}/toggle-active",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_admin_reset_password_forces_change_on_next_login(client: AsyncClient):
    await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    user = await register_user(client, "reset@vault.io", "resetuser")

    resp = await client.post(
        f"/api/users/{user['id']}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    temp_pw = resp.json()["temporary_password"]

    # Old password no longer works
    old = await client.post(
        "/api/auth/login", json={"email": "reset@vault.io", "password": "UserPass1!"}
    )
    assert old.status_code == 401

    # Temp password logs in to the change-password challenge, not the app
    resp = await client.post(
        "/api/auth/login", json={"email": "reset@vault.io", "password": temp_pw}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["password_change_required"] is True
    assert body["access_token"] == ""

    resp = await client.post(
        "/api/auth/complete-password-change",
        json={
            "password_change_token": body["password_change_token"],
            "new_password": "BrandNewPass9",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]

    # New password now logs in normally; temp password is dead
    assert await login(client, "reset@vault.io", "BrandNewPass9")
    dead = await client.post(
        "/api/auth/login", json={"email": "reset@vault.io", "password": temp_pw}
    )
    assert dead.status_code == 401


@pytest.mark.asyncio
async def test_non_admin_cannot_reset_password(client: AsyncClient):
    await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    u1 = await register_user(client, "t1@vault.io", "t1user")
    u2 = await register_user(client, "t2@vault.io", "t2user")
    await client.patch(
        f"/api/users/{u1['id']}/role",
        json={"role": "team"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    team_token = await login(client, "t1@vault.io", "UserPass1!")
    resp = await client.post(
        f"/api/users/{u2['id']}/reset-password",
        headers={"Authorization": f"Bearer {team_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_cannot_reset_own_password(client: AsyncClient):
    admin = await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    resp = await client.post(
        f"/api/users/{admin['id']}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400


# ── SFTP access toggle ────────────────────────────────────────────────────────
async def _admin(client):
    await create_admin(client)
    tok = await login(client, "admin@vault.io", "AdminPass1")
    return {"Authorization": f"Bearer {tok}"}


@pytest.mark.asyncio
async def test_sftp_enable_derives_username_from_email(client: AsyncClient):
    h = await _admin(client)
    u = await register_user(client, "Jean.Baptiste@vault.io", "jb")
    assert u.get("sftp_enabled") is False
    r = await client.patch(f"/api/users/{u['id']}/sftp", json={"enabled": True}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["sftp_enabled"] is True
    assert r.json()["sftp_username"] == "jeanbaptiste"


@pytest.mark.asyncio
async def test_sftp_enable_with_explicit_username(client: AsyncClient):
    h = await _admin(client)
    u = await register_user(client, "partner@vault.io", "partner")
    r = await client.patch(f"/api/users/{u['id']}/sftp", json={"enabled": True, "username": "crc_user"}, headers=h)
    assert r.status_code == 200 and r.json()["sftp_username"] == "crc_user"


@pytest.mark.asyncio
async def test_sftp_rejects_bad_or_reserved_usernames(client: AsyncClient):
    h = await _admin(client)
    u = await register_user(client, "x@vault.io", "xuser")
    for bad in ("Bad Name", "1abc", "a", "root", "a" * 40, "x;rm"):
        r = await client.patch(f"/api/users/{u['id']}/sftp", json={"enabled": True, "username": bad}, headers=h)
        assert r.status_code == 400, (bad, r.text)


@pytest.mark.asyncio
async def test_sftp_username_must_be_unique(client: AsyncClient):
    h = await _admin(client)
    a = await register_user(client, "a@vault.io", "auser")
    b = await register_user(client, "b@vault.io", "buser")
    assert (await client.patch(f"/api/users/{a['id']}/sftp", json={"enabled": True, "username": "shared"}, headers=h)).status_code == 200
    r = await client.patch(f"/api/users/{b['id']}/sftp", json={"enabled": True, "username": "shared"}, headers=h)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_sftp_disable_keeps_username_and_reenable_restores_it(client: AsyncClient):
    h = await _admin(client)
    u = await register_user(client, "keep@vault.io", "keepuser")
    await client.patch(f"/api/users/{u['id']}/sftp", json={"enabled": True}, headers=h)
    off = await client.patch(f"/api/users/{u['id']}/sftp", json={"enabled": False}, headers=h)
    assert off.json()["sftp_enabled"] is False and off.json()["sftp_username"] == "keep"
    on = await client.patch(f"/api/users/{u['id']}/sftp", json={"enabled": True}, headers=h)
    assert on.json()["sftp_enabled"] is True and on.json()["sftp_username"] == "keep"


@pytest.mark.asyncio
async def test_sftp_username_cannot_be_changed_once_set(client: AsyncClient):
    h = await _admin(client)
    u = await register_user(client, "fixed@vault.io", "fixeduser")
    await client.patch(f"/api/users/{u['id']}/sftp", json={"enabled": True}, headers=h)
    r = await client.patch(f"/api/users/{u['id']}/sftp", json={"enabled": True, "username": "other"}, headers=h)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_sftp_non_admin_forbidden_and_unknown_user_404(client: AsyncClient):
    h = await _admin(client)
    u = await register_user(client, "plain@vault.io", "plainuser")
    tok = await login(client, "plain@vault.io", "UserPass1!")
    r = await client.patch(f"/api/users/{u['id']}/sftp", json={"enabled": True}, headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403
    r = await client.patch("/api/users/00000000-0000-0000-0000-000000000000/sftp", json={"enabled": True}, headers=h)
    assert r.status_code == 404


# ── VPN access toggle ─────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_vpn_toggle_admin_only(client: AsyncClient):
    h = await _admin(client)
    u = await register_user(client, "vpn@vault.io", "vpnuser")
    assert u.get("vpn_enabled") is False and u.get("vpn_ready") is False
    r = await client.patch(f"/api/users/{u['id']}/vpn", json={"enabled": True}, headers=h)
    assert r.status_code == 200 and r.json()["vpn_enabled"] is True and r.json()["vpn_ready"] is False
    tok = await login(client, "vpn@vault.io", "UserPass1!")
    r = await client.patch(f"/api/users/{u['id']}/vpn", json={"enabled": False}, headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403
    r = await client.get(f"/api/users/{u['id']}/vpn/config", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_vpn_config_not_ready_until_sync_stores_it(client: AsyncClient):
    h = await _admin(client)
    u = await register_user(client, "cfg@vault.io", "cfguser")
    await client.patch(f"/api/users/{u['id']}/vpn", json={"enabled": True}, headers=h)
    r = await client.get(f"/api/users/{u['id']}/vpn/config", headers=h)
    assert r.status_code == 200 and r.json() == {"ready": False, "filename": None, "config": None, "qr_svg": None}


@pytest.mark.asyncio
async def test_vpn_sync_store_then_admin_reads_decrypted_config(client: AsyncClient):
    from app.cli_vpn import cmd_list, cmd_store
    from tests.conftest import _TestSession as TestSession
    h = await _admin(client)
    u = await register_user(client, "setup@vault.io", "setupuser")
    await client.patch(f"/api/users/{u['id']}/vpn", json={"enabled": True}, headers=h)
    cfg = "[Interface]\nPrivateKey = SECRETKEY\n[Peer]\nAllowedIPs = 10.10.108.68/32\n"
    res = await cmd_store({"user_id": u["id"], "client_id": 7, "config": cfg, "qr_svg": "<svg>qr</svg>"}, session_factory=TestSession)
    assert res == {"ok": True}
    listed = {x["email"]: x for x in await cmd_list(session_factory=TestSession)}
    assert listed["setup@vault.io"]["vpn_client_id"] == 7 and listed["setup@vault.io"]["vpn_ready"] is True
    r = await client.get(f"/api/users/{u['id']}/vpn/config", headers=h)
    body = r.json()
    assert r.status_code == 200 and body["ready"] is True and body["config"] == cfg and body["qr_svg"] == "<svg>qr</svg>"
    assert body["filename"].endswith(".conf")
    # stored encrypted, not in clear
    async with TestSession() as db:
        from sqlalchemy import select
        from app.models.user import User
        row = (await db.execute(select(User).where(User.email == "setup@vault.io"))).scalar_one()
        assert "SECRETKEY" not in (row.vpn_config_enc or "")
    # switching VPN off hides the setup again (entry is disabled by the sync job)
    await client.patch(f"/api/users/{u['id']}/vpn", json={"enabled": False}, headers=h)
    assert (await client.get(f"/api/users/{u['id']}/vpn/config", headers=h)).json()["ready"] is False


@pytest.mark.asyncio
async def test_sftp_vpn_fields_hidden_from_non_admins(client: AsyncClient):
    h = await _admin(client)
    t = await register_user(client, "team2@vault.io", "team2")
    await client.patch(f"/api/users/{t['id']}/role", json={"role": "team"}, headers=h)
    await client.patch(f"/api/users/{t['id']}/sftp", json={"enabled": True}, headers=h)
    await client.patch(f"/api/users/{t['id']}/vpn", json={"enabled": True}, headers=h)
    admin_view = {u["email"]: u for u in (await client.get("/api/users", headers=h)).json()}
    assert admin_view["team2@vault.io"]["sftp_enabled"] is True and admin_view["team2@vault.io"]["vpn_enabled"] is True
    tok = await login(client, "team2@vault.io", "UserPass1!")
    team_view = {u["email"]: u for u in (await client.get("/api/users", headers={"Authorization": f"Bearer {tok}"})).json()}
    tv = team_view["team2@vault.io"]
    assert tv["sftp_enabled"] is False and tv["sftp_username"] is None and tv["vpn_enabled"] is False
