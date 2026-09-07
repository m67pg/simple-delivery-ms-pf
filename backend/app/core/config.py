from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定。.env / 環境変数から読み込む。"""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Neon PostgreSQL
    # アプリの通常クエリはプーラー経由(DATABASE_URL)、
    # Alembicのマイグレーションは直接接続(DIRECT_URL)を使う
    database_url: str
    direct_url: str | None = None

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # CORS(カンマ区切り文字列で受け取り、リストに変換する)
    cors_origins: str = "http://localhost:3000"

    env: str = "development"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
