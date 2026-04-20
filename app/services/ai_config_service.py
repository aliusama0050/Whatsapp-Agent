from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import AIConfig

CONFIG_ID = "ai_config_singleton"


async def get_ai_config(session: AsyncSession) -> dict:
    """Get the AI config. Returns defaults if not yet configured."""
    stmt = select(AIConfig).where(AIConfig.id == CONFIG_ID)
    result = await session.execute(stmt)
    doc = result.scalars().first()
    if doc:
        return {
            "system_prompt": doc.system_prompt or "",
            "fallback_message": doc.fallback_message or "",
            "knowledge_entries": doc.knowledge_entries or [],
        }
    return {}


async def update_ai_config(session: AsyncSession, data: dict) -> dict:
    """Update the AI config singleton. Creates if not exists."""
    now = datetime.now(timezone.utc)

    values = {
        "id": CONFIG_ID,
        "created_at": now,
        "updated_at": now,
    }
    update_set = {"updated_at": now}

    if "system_prompt" in data:
        values["system_prompt"] = data["system_prompt"]
        update_set["system_prompt"] = data["system_prompt"]
    if "fallback_message" in data:
        values["fallback_message"] = data["fallback_message"]
        update_set["fallback_message"] = data["fallback_message"]
    if "knowledge_entries" in data:
        values["knowledge_entries"] = data["knowledge_entries"]
        update_set["knowledge_entries"] = data["knowledge_entries"]

    stmt = pg_insert(AIConfig).values(**values).on_conflict_do_update(
        index_elements=["id"],
        set_=update_set,
    ).returning(AIConfig)

    result = await session.execute(stmt)
    doc = result.scalars().first()
    await session.flush()

    return {
        "system_prompt": doc.system_prompt or "",
        "fallback_message": doc.fallback_message or "",
        "knowledge_entries": doc.knowledge_entries or [],
    }
