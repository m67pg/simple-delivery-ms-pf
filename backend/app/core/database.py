from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# Neonはサーバーレスで接続がスケールダウンすることがあるため、
# pool_pre_ping で切断済みコネクションを検知させる。
# asyncpgは接続URLの sslmode/channel_binding クエリパラメータを解釈できないため、
# connect_args で ssl を明示的に指定する(Neonは常にSSL接続が必須)。
# また、Neonの接続プーラー(PgBouncerのトランザクションモード)はプリペアドステートメントに
# 対応していないため、statement_cache_size=0 でasyncpgのプリペアドステートメント
# キャッシュを無効化する(有効のままだと "prepared statement does not exist" 等のエラーになる)。
# これらはasyncpg(PostgreSQL)専用のオプションのため、それ以外のドライバ(テスト用sqlite等)では付与しない。
_connect_args = {}
if settings.database_url.startswith("postgresql+asyncpg"):
    _connect_args = {"ssl": "require", "statement_cache_size": 0}

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=(settings.env == "development"),
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPIの Depends() で使うDBセッション取得用ジェネレータ"""
    async with AsyncSessionLocal() as session:
        yield session
