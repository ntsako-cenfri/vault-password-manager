"""Direct-grant tests — grant access, list, revoke, case-insensitive email, idempotency."""
import pytest
from httpx import AsyncClient

from tests.conftest import create_admin, login, register_user

_ITEM = {
    "title": "Secret Server",
    "fields": [{"field_type": "password", "label": "Root PW", "value": "s3cret!", "order": 0}],
}


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _setup(client: AsyncClient) -> tuple[str, str]:
    """Create admin + vault item. Returns (admin_token, item_id)."""
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    r = await client.post("/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    return token, r.json()["id"]


# ── Grant access ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_grant_to_existing_user(client: AsyncClient):
    """Granting to a registered user resolves granted_to_id immediately."""
    token, item_id = await _setup(client)
    await register_user(client, "alice@vault.io", "alice")

    r = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "alice@vault.io"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["granted_to_email"] == "alice@vault.io"
    assert body["granted_to_id"] is not None


@pytest.mark.asyncio
async def test_grant_to_unregistered_email(client: AsyncClient):
    """Granting to an email that hasn't registered yet creates a pending grant."""
    token, item_id = await _setup(client)

    r = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "pending@future.io"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["granted_to_email"] == "pending@future.io"
    assert body["granted_to_id"] is None  # pending until user registers


@pytest.mark.asyncio
async def test_grant_case_insensitive_email(client: AsyncClient):
    """Grant created with mixed-case email should resolve against lowercase-registered user."""
    token, item_id = await _setup(client)
    # Register with lowercase
    await register_user(client, "bob@vault.io", "bob")

    # Grant using mixed case
    r = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "BOB@VAULT.IO"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    body = r.json()
    # Email should be stored normalised to lowercase
    assert body["granted_to_email"] == "bob@vault.io"
    # User must be resolved (not pending)
    assert body["granted_to_id"] is not None


@pytest.mark.asyncio
async def test_grant_idempotent(client: AsyncClient):
    """Granting the same email twice returns the existing grant (no duplicate)."""
    token, item_id = await _setup(client)

    payload = {"email": "carol@vault.io"}
    r1 = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    r2 = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] == r2.json()["id"]


@pytest.mark.asyncio
async def test_grant_resolves_pending_on_second_call(client: AsyncClient):
    """If a pending grant exists and the user has since registered, re-granting resolves it."""
    token, item_id = await _setup(client)

    # First grant — user not yet registered → pending
    r1 = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "dave@vault.io"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r1.json()["granted_to_id"] is None

    # User registers
    await register_user(client, "dave@vault.io", "dave")

    # Second grant (idempotent path) — should now resolve the user id
    r2 = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "dave@vault.io"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.json()["id"] == r1.json()["id"]
    assert r2.json()["granted_to_id"] is not None


@pytest.mark.asyncio
async def test_grant_owner_cannot_self_grant(client: AsyncClient):
    """Owner cannot grant access to themselves."""
    token, item_id = await _setup(client)
    r = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "admin@vault.io"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_non_owner_cannot_grant(client: AsyncClient):
    """A different user who doesn't own the item cannot grant access."""
    token, item_id = await _setup(client)
    await register_user(client, "eve@vault.io", "eve")
    other_token = await login(client, "eve@vault.io", "UserPass1!")

    r = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "someone@vault.io"},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert r.status_code == 403


# ── List grants ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_grants(client: AsyncClient):
    """Owner can list all grants on an item."""
    token, item_id = await _setup(client)
    await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "frank@vault.io"},
        headers={"Authorization": f"Bearer {token}"},
    )
    r = await client.get(
        f"/api/shares/vault/{item_id}/grants",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    grants = r.json()
    assert len(grants) == 1
    assert grants[0]["granted_to_email"] == "frank@vault.io"


@pytest.mark.asyncio
async def test_non_owner_cannot_list_grants(client: AsyncClient):
    """Non-owner cannot list grants on an item they don't own."""
    token, item_id = await _setup(client)
    await register_user(client, "grace@vault.io", "grace")
    other_token = await login(client, "grace@vault.io", "UserPass1!")

    r = await client.get(
        f"/api/shares/vault/{item_id}/grants",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert r.status_code == 403


# ── Revoke grant ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_revoke_grant(client: AsyncClient):
    """Owner can revoke a grant; grant disappears from list."""
    token, item_id = await _setup(client)
    create_r = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "henry@vault.io"},
        headers={"Authorization": f"Bearer {token}"},
    )
    grant_id = create_r.json()["id"]

    del_r = await client.delete(
        f"/api/shares/vault/{item_id}/grant/{grant_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_r.status_code == 204

    list_r = await client.get(
        f"/api/shares/vault/{item_id}/grants",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_r.json() == []


@pytest.mark.asyncio
async def test_non_owner_cannot_revoke(client: AsyncClient):
    """Non-owner cannot revoke a grant."""
    token, item_id = await _setup(client)
    create_r = await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "ivan@vault.io"},
        headers={"Authorization": f"Bearer {token}"},
    )
    grant_id = create_r.json()["id"]

    await register_user(client, "judy@vault.io", "judy")
    other_token = await login(client, "judy@vault.io", "UserPass1!")
    r = await client.delete(
        f"/api/shares/vault/{item_id}/grant/{grant_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert r.status_code == 403


# ── Shared vault endpoint ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_shared_items_appear_in_grantee_vault(client: AsyncClient):
    """Grantee can see the shared item in GET /api/vault/shared."""
    token, item_id = await _setup(client)
    await register_user(client, "kate@vault.io", "kate")

    await client.post(
        f"/api/shares/vault/{item_id}/grant",
        json={"email": "kate@vault.io"},
        headers={"Authorization": f"Bearer {token}"},
    )

    kate_token = await login(client, "kate@vault.io", "UserPass1!")
    r = await client.get("/api/vault/shared", headers={"Authorization": f"Bearer {kate_token}"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["item"]["title"] == "Secret Server"


@pytest.mark.asyncio
async def test_shared_items_empty_without_grants(client: AsyncClient):
    """Grantee with no grants sees an empty shared list."""
    await create_admin(client)
    await register_user(client, "liam@vault.io", "liam")
    liam_token = await login(client, "liam@vault.io", "UserPass1!")

    r = await client.get("/api/vault/shared", headers={"Authorization": f"Bearer {liam_token}"})
    assert r.status_code == 200
    assert r.json() == []
