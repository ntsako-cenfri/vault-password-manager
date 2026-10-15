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
