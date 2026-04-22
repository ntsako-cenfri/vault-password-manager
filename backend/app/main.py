from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, shares, users, vault


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (Alembic handles prod migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Vault — Team Password Manager",
    version="1.0.0",
    lifespan=lifespan,
)

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
