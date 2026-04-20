import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.rbac import require_admin
from app.database import get_session
from app.models.db_models import User, Conversation, Message
from app.services.audit_service import get_audit_logs
from app.config import ENVIRONMENT

router = APIRouter()

_start_time = time.time()


@router.get("/dashboard")
async def admin_dashboard(
    _user=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    """System overview stats for admin dashboard."""
    now = datetime.now(timezone.utc)

    total_users = await session.scalar(select(func.count()).select_from(User)) or 0
    active_users = await session.scalar(
        select(func.count()).select_from(User).where(User.is_active == True)
    ) or 0
    total_conversations = await session.scalar(
        select(func.count()).select_from(Conversation)
    ) or 0
    total_messages = await session.scalar(
        select(func.count()).select_from(Message)
    ) or 0
    active_windows = await session.scalar(
        select(func.count()).select_from(Conversation).where(
            Conversation.window_expires_at > now
        )
    ) or 0

    uptime_seconds = int(time.time() - _start_time)

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "active_windows": active_windows,
        "uptime_seconds": uptime_seconds,
        "environment": ENVIRONMENT,
    }


@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    action: str | None = Query(None),
    _user=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    logs, total = await get_audit_logs(session, page, limit, action)
    return {"logs": logs, "total": total, "page": page, "limit": limit}


@router.get("/health")
async def system_health(
    _user=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    """System health check with detailed info."""
    # Database check
    db_ok = False
    try:
        await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    # WhatsApp API check
    wa_ok = False
    try:
        from app.whatsapp import client as wa_client
        resp = await wa_client.get(
            "https://graph.facebook.com/v22.0/me",
            timeout=5.0,
        )
        wa_ok = resp.status_code == 200
    except Exception:
        pass

    uptime_seconds = int(time.time() - _start_time)

    return {
        "database": "connected" if db_ok else "disconnected",
        "whatsapp_api": "connected" if wa_ok else "disconnected",
        "environment": ENVIRONMENT,
        "uptime_seconds": uptime_seconds,
    }
