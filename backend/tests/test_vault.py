"""Vault item CRUD and credential field tests."""
import pytest
from httpx import AsyncClient

from tests.conftest import create_admin, login, register_user

_ITEM = {"title": "Prod Server", "description": "Main prod SSH", "fields": [
    {"field_type": "username", "label": "SSH user", "value": "root", "order": 0},
    {"field_type": "password", "label": "Root password", "value": "s3cr3t!", "order": 1},
]}


@pytest.mark.asyncio
async def test_create_vault_item(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    resp = await client.post(
        "/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Prod Server"
    assert len(data["fields"]) == 2
    # Values must be decrypted in response
    values = {f["label"]: f["value"] for f in data["fields"]}
    assert values["SSH user"] == "root"
    assert values["Root password"] == "s3cr3t!"


@pytest.mark.asyncio
async def test_list_own_items(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    await client.post("/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {token}"})
    resp = await client.get("/api/vault", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_admin_sees_only_own_items(client: AsyncClient):
    """Admin's vault list shows only items they own — not other users' items."""
    await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    await register_user(client, "a@vault.io", "usera")
    user_token = await login(client, "a@vault.io", "UserPass1!")
    # Another user creates an item — admin should NOT see it in their own vault list
    await client.post("/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {user_token}"})
    resp = await client.get("/api/vault", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    # Admin owns 0 items — the other user's item must not appear here
    assert len(resp.json()) == 0
    # Admin creates their own item — now they should see exactly 1
    await client.post("/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {admin_token}"})
    resp2 = await client.get("/api/vault", headers={"Authorization": f"Bearer {admin_token}"})
    assert len(resp2.json()) == 1


@pytest.mark.asyncio
async def test_external_cannot_see_others_item(client: AsyncClient):
    await create_admin(client)
    admin_token = await login(client, "admin@vault.io", "AdminPass1")
    create_resp = await client.post(
        "/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {admin_token}"}
    )
    item_id = create_resp.json()["id"]

    await register_user(client, "ext@vault.io", "extuser")
    ext_token = await login(client, "ext@vault.io", "UserPass1!")
    resp = await client.get(
        f"/api/vault/{item_id}", headers={"Authorization": f"Bearer {ext_token}"}
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_item(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    create = await client.post("/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {token}"})
    item_id = create.json()["id"]
    resp = await client.patch(
        f"/api/vault/{item_id}",
        json={"title": "Updated Title"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_delete_item(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    create = await client.post("/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {token}"})
    item_id = create.json()["id"]
    del_resp = await client.delete(
        f"/api/vault/{item_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert del_resp.status_code == 204
    get_resp = await client.get(
        f"/api/vault/{item_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_add_field_to_existing_item(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    create = await client.post(
        "/api/vault", json={"title": "Item", "fields": []}, headers={"Authorization": f"Bearer {token}"}
    )
    item_id = create.json()["id"]
    resp = await client.post(
        f"/api/vault/{item_id}/fields",
        json={"field_type": "api_key", "label": "API Key", "value": "sk-abc123", "order": 0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_delete_field(client: AsyncClient):
    await create_admin(client)
    token = await login(client, "admin@vault.io", "AdminPass1")
    create = await client.post("/api/vault", json=_ITEM, headers={"Authorization": f"Bearer {token}"})
    item = create.json()
    field_id = item["fields"][0]["id"]
    resp = await client.delete(
        f"/api/vault/{item['id']}/fields/{field_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_unauthenticated_vault_access(client: AsyncClient):
    resp = await client.get("/api/vault")
    assert resp.status_code == 403
