from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.models.db_models import Conversation, Message

router = APIRouter()


@router.get("/stats")
async def get_stats(
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_conversations = await session.scalar(
        select(func.count()).select_from(Conversation)
    )
    active_windows = await session.scalar(
        select(func.count()).select_from(Conversation).where(
            Conversation.window_expires_at > now
        )
    )
    human_takeovers = await session.scalar(
        select(func.count()).select_from(Conversation).where(
            Conversation.agent_status == "human_takeover"
        )
    )
    messages_today = await session.scalar(
        select(func.count()).select_from(Message).where(
            Message.timestamp >= today_start
        )
    )

    return {
        "total_conversations": total_conversations or 0,
        "active_windows": active_windows or 0,
        "human_takeovers": human_takeovers or 0,
        "messages_today": messages_today or 0,
    }
