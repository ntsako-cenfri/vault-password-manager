"""Share link tests — create, access, strict mode, expiry, revoke."""
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient

from tests.conftest import create_admin, login, register_user

_ITEM = {"title": "Shared Server", "fields": [
    {"field_type": "password", "label": "Root PW", "value": "topsecret1", "order": 0}
]}


async def _setup_item(client: AsyncClient) -> tuple[str, str]:
    """Create admin + a vault item. Returns (admin_token, item_id)."""
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    r = await client.post("/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {token}"})
    return token, r.json()["id"]


# ── Create ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_share_link(client: AsyncClient):
    token, item_id = await _setup_item(client)
    resp = await client.post(
        f"/api/shares/vault/{item_id}",
        json={"is_strict": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    assert "token" in resp.json()


@pytest.mark.asyncio
async def test_only_owner_can_share(client: AsyncClient):
    token, item_id = await _setup_item(client)
    await register_user(client, "other@vault.io", "otheruser")
    other_token = await login(client, "other@vault.io", "UserPass1!")
    resp = await client.post(
        f"/api/shares/vault/{item_id}",
        json={"is_strict": True},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


# ── Resolve (unauthenticated) ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_resolve_share_link(client: AsyncClient):
    token, item_id = await _setup_item(client)
    share = await client.post(
        f"/api/shares/vault/{item_id}",
        json={"is_strict": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    share_token = share.json()["token"]
    resp = await client.get(f"/api/shares/resolve/{share_token}")
    assert resp.status_code == 200
    assert resp.json()["is_strict"] is True


@pytest.mark.asyncio
async def test_resolve_nonexistent_token(client: AsyncClient):
    resp = await client.get("/api/shares/resolve/bad-token-does-not-exist")
    assert resp.status_code == 404


# ── Access ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_access_shared_item_authenticated(client: AsyncClient):
    admin_token, item_id = await _setup_item(client)
    share = await client.post(
        f"/api/shares/vault/{item_id}",
        json={"is_strict": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    share_token = share.json()["token"]

    await register_user(client, "viewer@vault.io", "vieweruser")
    viewer_token = await login(client, "viewer@vault.io", "UserPass1!")

    resp = await client.get(
        f"/api/shares/access/{share_token}",
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["item"]["title"] == "Shared Server"
    # Decrypted field value should be visible
    field_values = {f["label"]: f["value"] for f in data["item"]["fields"]}
    assert field_values["Root PW"] == "topsecret1"


@pytest.mark.asyncio
async def test_access_strict_share_unauthenticated(client: AsyncClient):
    admin_token, item_id = await _setup_item(client)
    share = await client.post(
        f"/api/shares/vault/{item_id}",
        json={"is_strict": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    share_token = share.json()["token"]
    # No auth header
    resp = await client.get(f"/api/shares/access/{share_token}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_email_targeted_share_wrong_user(client: AsyncClient):
    admin_token, item_id = await _setup_item(client)
    share = await client.post(
        f"/api/shares/vault/{item_id}",
        json={"is_strict": True, "recipient_email": "target@vault.io"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    share_token = share.json()["token"]

    # Different user tries to access
    await register_user(client, "wrong@vault.io", "wronguser")
    wrong_token = await login(client, "wrong@vault.io", "UserPass1!")
    resp = await client.get(
        f"/api/shares/access/{share_token}",
        headers={"Authorization": f"Bearer {wrong_token}"},
    )
    assert resp.status_code == 403


# ── Revoke ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_revoke_share(client: AsyncClient):
    admin_token, item_id = await _setup_item(client)
    share = await client.post(
        f"/api/shares/vault/{item_id}",
        json={"is_strict": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    share_token = share.json()["token"]
    revoke = await client.delete(
        f"/api/shares/{share_token}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert revoke.status_code == 204
    resolve = await client.get(f"/api/shares/resolve/{share_token}")
    assert resolve.status_code == 404


@pytest.mark.asyncio
async def test_list_shares_for_item(client: AsyncClient):
    admin_token, item_id = await _setup_item(client)
    await client.post(
        f"/api/shares/vault/{item_id}",
        json={"is_strict": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    resp = await client.get(
        f"/api/shares/vault/{item_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
