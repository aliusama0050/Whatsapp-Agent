import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import AuditLog


async def log_action(
    session: AsyncSession,
    user_id: uuid.UUID | None,
    username: str,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    details: dict | None = None,
):
    """Record an admin action in the audit log."""
    entry = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    session.add(entry)
    await session.flush()


async def get_audit_logs(
    session: AsyncSession,
    page: int = 1,
    limit: int = 50,
    action_filter: str | None = None,
) -> tuple[list[dict], int]:
    """Get paginated audit logs."""
    query = select(AuditLog)
    count_query = select(func.count()).select_from(AuditLog)

    if action_filter:
        query = query.where(AuditLog.action == action_filter)
        count_query = count_query.where(AuditLog.action == action_filter)

    total = await session.scalar(count_query) or 0
    query = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    result = await session.execute(query)
    logs = [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "username": log.username,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in result.scalars().all()
    ]

    return logs, total
