from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.database import Base, engine
from app.routers import auth, shares, users, vault
import app.models.item_grant  # noqa: F401 – registers table with Base.metadata
import app.models.audit_log   # noqa: F401 – registers table with Base.metadata
import app.models.revoked_token  # noqa: F401 – registers table with Base.metadata

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate secrets are not defaults in production
    if settings.environment == "production":
        assert settings.secret_key != "change_me_in_production", \
            "SECRET_KEY must be set to a strong random value in production"
        assert settings.master_encryption_key != "change_me_in_production", \
            "MASTER_ENCRYPTION_KEY must be set to a strong random value in production"
    # Auto-create tables on startup (Alembic handles prod migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Vault — Team Password Manager",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(vault.router, prefix="/api")
app.include_router(shares.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
