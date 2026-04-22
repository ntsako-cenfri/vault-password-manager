"""Auth module tests — positive & negative cases."""
import pytest
from httpx import AsyncClient

from tests.conftest import create_admin, login, register_user


# ── Setup ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_setup_status_incomplete(client: AsyncClient):
    resp = await client.get("/api/auth/setup/status")
    assert resp.status_code == 200
    assert resp.json()["setup_complete"] is False


@pytest.mark.asyncio
async def test_create_first_admin(client: AsyncClient):
    user = await create_admin(client)
    assert user["role"] == "admin"
    assert user["email"] == "admin@vault.io"


@pytest.mark.asyncio
async def test_setup_blocked_after_first_admin(client: AsyncClient):
    await create_admin(client)
    resp = await client.post(
        "/api/auth/setup",
        json={"email": "admin2@vault.io", "username": "admin2", "password": "AdminPass1"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_setup_status_complete_after_admin(client: AsyncClient):
    await create_admin(client)
    resp = await client.get("/api/auth/setup/status")
    assert resp.json()["setup_complete"] is True


# ── Registration ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_register_new_user(client: AsyncClient):
    user = await register_user(client, "user@vault.io", "user1")
    assert user["role"] == "external"
    assert user["email"] == "user@vault.io"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await register_user(client, "dup@vault.io", "dupuser")
    resp = await client.post(
        "/api/auth/register",
        json={"email": "dup@vault.io", "username": "dupuser2", "password": "UserPass1!"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    await register_user(client, "a@vault.io", "sameuser")
    resp = await client.post(
        "/api/auth/register",
        json={"email": "b@vault.io", "username": "sameuser", "password": "UserPass1!"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={"email": "weak@vault.io", "username": "weakuser", "password": "weak"},
    )
    assert resp.status_code == 422


# ── Login / Tokens ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await create_admin(client)
    resp = await client.post(
        "/api/auth/login",
        json={"email": "admin@vault.io", "password": "AdminPass1"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await create_admin(client)
    resp = await client.post(
        "/api/auth/login",
        json={"email": "admin@vault.io", "password": "WrongPass1"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    resp = await client.post(
        "/api/auth/login",
        json={"email": "ghost@vault.io", "password": "AnyPass1"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient):
    await create_admin(client)
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": "admin@vault.io", "password": "AdminPass1"},
    )
    refresh_token = login_resp.json()["refresh_token"]
    resp = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_refresh_with_access_token_rejected(client: AsyncClient):
    await create_admin(client)
    access_token = await login(client, "admin@vault.io", "AdminPass1")
    resp = await client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_endpoint(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@vault.io"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 403


# ── Password reset ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_password_reset_success(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    resp = await client.post(
        "/api/auth/reset-password",
        json={"current_password": "AdminPass1", "new_password": "NewAdminPass2"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 204
    # Re-login with new password
    assert (await login(client, "admin@vault.io", "NewAdminPass2")) is not None


@pytest.mark.asyncio
async def test_password_reset_wrong_current(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    resp = await client.post(
        "/api/auth/reset-password",
        json={"current_password": "WrongPass9", "new_password": "NewAdminPass2"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
