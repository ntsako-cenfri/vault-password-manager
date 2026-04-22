"""Shared pytest fixtures — uses SQLite in-memory for fast, isolated tests."""
import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

_engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
_TestSession = async_sessionmaker(bind=_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ── Helpers ───────────────────────────────────────────────────────────────────

async def create_admin(client: AsyncClient) -> dict:
    resp = await client.post(
        "/api/auth/setup",
        json={"email": "admin@vault.io", "username": "admin", "password": "AdminPass1"},
    )
    assert resp.status_code == 201
    return resp.json()


async def login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


async def register_user(
    client: AsyncClient, email: str, username: str, password: str = "UserPass1!"
) -> dict:
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "username": username, "password": password},
    )
    assert resp.status_code == 201
    return resp.json()
