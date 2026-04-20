from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.rbac import require_admin
from app.database import get_session
from app.services.ai_config_service import get_ai_config, update_ai_config
from app.services.audit_service import log_action
from app.agent import SYSTEM_PROMPT, FALLBACK_MESSAGE

router = APIRouter()


class KnowledgeEntry(BaseModel):
    title: str
    content: str


class AIConfigUpdate(BaseModel):
    system_prompt: str | None = None
    fallback_message: str | None = None
    knowledge_entries: list[KnowledgeEntry] | None = None


@router.get("/")
async def get_config(
    _user=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    config = await get_ai_config(session)
    return {
        "system_prompt": config.get("system_prompt") or SYSTEM_PROMPT,
        "fallback_message": config.get("fallback_message") or FALLBACK_MESSAGE,
        "knowledge_entries": config.get("knowledge_entries", []),
        "default_system_prompt": SYSTEM_PROMPT,
        "default_fallback_message": FALLBACK_MESSAGE,
    }


@router.put("/")
async def update_config(
    body: AIConfigUpdate,
    _user=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    data = body.model_dump(exclude_none=True)
    if "knowledge_entries" in data:
        data["knowledge_entries"] = [
            e.model_dump() if hasattr(e, "model_dump") else e
            for e in data["knowledge_entries"]
        ]
    result = await update_ai_config(session, data)
    await log_action(session, _user.id, _user.username, "ai_config_updated", "ai_config", None, {"fields": list(data.keys())})
    await session.commit()
    return result
