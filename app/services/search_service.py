from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Message, Conversation
from app.services.message_service import serialize_message


async def search_messages(
    session: AsyncSession, query: str, page: int = 1, limit: int = 20
) -> tuple[list[dict], int]:
    """Full-text search across messages using PostgreSQL tsvector."""
    ts_query = func.plainto_tsquery("english", query)
    ts_vector = func.to_tsvector("english", func.coalesce(
        Message.content["body"].astext, ""
    ))

    # Count total matches
    count_stmt = (
        select(func.count())
        .select_from(Message)
        .where(ts_vector.bool_op("@@")(ts_query))
    )
    total = await session.scalar(count_stmt) or 0

    # Fetch ranked results
    rank = func.ts_rank(ts_vector, ts_query).label("rank")
    stmt = (
        select(Message, rank)
        .where(ts_vector.bool_op("@@")(ts_query))
        .order_by(text("rank DESC"))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await session.execute(stmt)

    results = []
    for row in result:
        msg = row[0]
        serialized = serialize_message(msg)

        # Include conversation context
        conv_stmt = select(Conversation).where(Conversation.id == msg.conversation_id)
        conv_result = await session.execute(conv_stmt)
        conv = conv_result.scalars().first()
        serialized["customer_name"] = conv.customer_name if conv else ""

        results.append(serialized)

    return results, total
