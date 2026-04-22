from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://vault_user:vault_pass@localhost:5432/password_manager"

    # JWT
    secret_key: str = "change_me_in_production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Encryption — master key used to wrap per-item AES keys
    master_encryption_key: str = "change_me_in_production"

    # File storage
    upload_dir: str = "/app/uploads"
    max_file_size_mb: int = 50

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"
    environment: str = "development"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
