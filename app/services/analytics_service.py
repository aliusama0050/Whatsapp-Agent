from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, case, text, literal_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Message, Conversation


async def get_analytics_overview(session: AsyncSession, days: int = 7) -> dict:
    """Get analytics overview for the specified period."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    # ── Simple counts ──
    total_messages = await session.scalar(
        select(func.count()).select_from(Message).where(Message.timestamp >= start)
    )
    inbound = await session.scalar(
        select(func.count()).select_from(Message).where(
            Message.timestamp >= start, Message.direction == "inbound"
        )
    )
    outbound = (total_messages or 0) - (inbound or 0)

    ai_messages = await session.scalar(
        select(func.count()).select_from(Message).where(
            Message.timestamp >= start,
            Message.direction == "outbound",
            Message.sender_type == "ai_agent",
        )
    )
    human_messages = await session.scalar(
        select(func.count()).select_from(Message).where(
            Message.timestamp >= start,
            Message.direction == "outbound",
            Message.sender_type == "human_agent",
        )
    )
    active_conversations = await session.scalar(
        select(func.count()).select_from(Conversation).where(
            Conversation.last_message_at >= start
        )
    )

    # ── Messages per day ──
    date_col = func.to_char(Message.timestamp, text("'YYYY-MM-DD'")).label("date")
    day_stmt = (
        select(
            date_col,
            func.count().label("total"),
            func.sum(case((Message.direction == "inbound", 1), else_=0)).label("inbound"),
            func.sum(case((Message.direction == "outbound", 1), else_=0)).label("outbound"),
        )
        .where(Message.timestamp >= start)
        .group_by(date_col)
        .order_by(date_col)
    )
    day_result = await session.execute(day_stmt)
    messages_per_day = [
        {"date": r.date, "total": r.total, "inbound": r.inbound, "outbound": r.outbound}
        for r in day_result
    ]

    # ── Messages per hour ──
    hour_col = func.extract("hour", Message.timestamp).label("hour")
    hour_stmt = (
        select(hour_col, func.count().label("count"))
        .where(Message.timestamp >= start)
        .group_by(hour_col)
        .order_by(hour_col)
    )
    hour_result = await session.execute(hour_stmt)
    messages_per_hour = [
        {"hour": int(r.hour), "count": r.count}
        for r in hour_result
    ]

    # ── Top conversations ──
    top_stmt = (
        select(
            Message.phone_number,
            func.count().label("message_count"),
            Conversation.customer_name,
        )
        .join(Conversation, Message.phone_number == Conversation.phone_number, isouter=True)
        .where(Message.timestamp >= start)
        .group_by(Message.phone_number, Conversation.customer_name)
        .order_by(func.count().desc())
        .limit(10)
    )
    top_result = await session.execute(top_stmt)
    top_conversations = [
        {
            "phone_number": r.phone_number,
            "customer_name": r.customer_name or "Unknown",
            "message_count": r.message_count,
        }
        for r in top_result
    ]

    # ── Average response time ──
    # Uses a raw SQL lateral join for performance
    avg_response_sql = text("""
        SELECT AVG(response_seconds) as avg_seconds FROM (
            SELECT EXTRACT(EPOCH FROM (reply.timestamp - inbound.timestamp)) as response_seconds
            FROM messages inbound
            CROSS JOIN LATERAL (
                SELECT timestamp FROM messages
                WHERE conversation_id = inbound.conversation_id
                  AND direction = 'outbound'
                  AND timestamp > inbound.timestamp
                ORDER BY timestamp LIMIT 1
            ) reply
            WHERE inbound.timestamp >= :start_date AND inbound.direction = 'inbound'
        ) sub
    """)
    avg_result = await session.execute(avg_response_sql, {"start_date": start})
    avg_row = avg_result.fetchone()
    avg_response_seconds = round(avg_row.avg_seconds, 1) if avg_row and avg_row.avg_seconds else None

    return {
        "period_days": days,
        "total_messages": total_messages or 0,
        "inbound_messages": inbound or 0,
        "outbound_messages": outbound,
        "ai_messages": ai_messages or 0,
        "human_messages": human_messages or 0,
        "active_conversations": active_conversations or 0,
        "avg_response_seconds": avg_response_seconds,
        "messages_per_day": messages_per_day,
        "messages_per_hour": messages_per_hour,
        "top_conversations": top_conversations,
    }
