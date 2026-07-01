from collections.abc import AsyncGenerator
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

# The backend connects with the service-role/postgres credentials and therefore
# bypasses RLS; authorization is enforced in the API layer (see core.security).
#
# Supabase's connection pooler runs pgbouncer in transaction mode, which does not
# support reused prepared-statement names. Disable asyncpg's per-connection cache
# and generate unique names for the prepares SQLAlchemy still performs (e.g. the
# jsonb codec setup on first connect).
engine = create_async_engine(
    settings.database_url.strip(),
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
    },
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async DB session."""
    async with SessionLocal() as session:
        yield session
