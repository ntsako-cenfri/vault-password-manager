import os

from pydantic_settings import BaseSettings, SettingsConfigDict


def _read_secret(name: str, default: str | None = None) -> str | None:
    """Resolve a secret from a Docker secret file first, then a plain env var.

    Precedence: ``<NAME>_FILE`` (a path, e.g. /run/secrets/jwt) → ``<NAME>`` env
    → ``default``. Using ``*_FILE`` keeps the secret out of the container's
    environment block, so it never leaks via ``docker inspect`` / a crashed proc.
    """
    file_path = os.getenv(f"{name}_FILE")
    if file_path and os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as fh:
            return fh.read().strip()
    return os.getenv(name, default)


class Settings(BaseSettings):
    # Only NON-secret configuration lives as declared fields — secrets are read
    # from files (see the properties below) so they stay out of the env block.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Database connection parts (non-secret) ─────────────────────────────────
    db_host: str = "db"
    db_port: int = 5432
    db_name: str = "password_manager"
    db_user: str = "vault_app"

    # ── Token lifetimes ────────────────────────────────────────────────────────
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # ── File storage ───────────────────────────────────────────────────────────
    upload_dir: str = "/app/uploads"
    max_file_size_mb: int = 50

    # ── App ────────────────────────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"
    environment: str = "development"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    # ── Secrets (file-backed via Docker secrets) ───────────────────────────────
    @property
    def secret_key(self) -> str:
        return _read_secret("SECRET_KEY", "change_me_in_production") or "change_me_in_production"

    @property
    def master_encryption_key(self) -> str:
        return _read_secret("MASTER_ENCRYPTION_KEY", "change_me_in_production") or "change_me_in_production"

    @property
    def db_password(self) -> str:
        return _read_secret("DB_PASSWORD", "") or ""

    @property
    def database_url(self) -> str:
        # An explicit DATABASE_URL (local dev convenience) always wins.
        explicit = _read_secret("DATABASE_URL")
        if explicit:
            return explicit
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
