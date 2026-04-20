import logging
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import DATABASE_URL

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=5,
    pool_pre_ping=True,
    echo=False,
    # Disable asyncpg prepared statement cache for PgBouncer compatibility.
    # Use Supabase SESSION pooler (port 5432) — transaction pooler (6543)
    # does NOT support prepared statements at all.
    connect_args={"statement_cache_size": 0},
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session():
    """FastAPI dependency that yields an async session."""
    async with async_session_maker() as session:
        yield session


async def init_db():
    """Verify database connection on startup (tables managed by Alembic)."""
    from app.models.db_models import _register_models  # noqa: F401

    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("PostgreSQL connection verified")


async def close_db():
    """Dispose the engine on shutdown."""
    await engine.dispose()
    logger.info("PostgreSQL connection pool closed")
