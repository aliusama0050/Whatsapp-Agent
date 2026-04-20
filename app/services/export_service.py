import csv
import io
from datetime import timezone
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Message, Conversation
from app.services.message_service import serialize_message

MAX_EXPORT_MESSAGES = 50_000


def _format_row(msg: Message) -> list[str]:
    """Format a single Message ORM object into a CSV row."""
    ts = msg.timestamp
    if ts:
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        ts_str = ts.strftime("%Y-%m-%d %H:%M:%S UTC")
    else:
        ts_str = ""

    content = msg.content or {}
    body = content.get("body", "")
    msg_type = msg.message_type or "text"

    if msg_type == "template":
        body = f"[Template: {content.get('template_name', 'unknown')}]"
    elif msg_type in ("image", "video", "audio", "document", "sticker"):
        label = msg_type.capitalize()
        caption = content.get("body", "")
        body = f"[{label}]{f': {caption}' if caption else ''}"

    return [
        ts_str,
        msg.direction or "",
        msg.sender_type or "",
        msg_type,
        body,
        msg.status or "",
    ]


async def export_conversation_csv_stream(
    session: AsyncSession, phone_number: str
) -> AsyncGenerator[str, None]:
    """Export a conversation as a streaming CSV."""
    conv_stmt = select(Conversation).where(Conversation.phone_number == phone_number)
    conv_result = await session.execute(conv_stmt)
    conv = conv_result.scalars().first()
    if not conv:
        return

    # Header
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Timestamp", "Direction", "Sender", "Type", "Content", "Status"])
    yield buf.getvalue()

    # Stream rows
    msg_stmt = (
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.timestamp)
        .limit(MAX_EXPORT_MESSAGES)
    )
    result = await session.stream(msg_stmt)

    buf = io.StringIO()
    writer = csv.writer(buf)
    count = 0

    async for row in result.scalars():
        writer.writerow(_format_row(row))
        count += 1
        if count % 500 == 0:
            yield buf.getvalue()
            buf = io.StringIO()
            writer = csv.writer(buf)

    remaining = buf.getvalue()
    if remaining:
        yield remaining


async def export_conversation_json(
    session: AsyncSession, phone_number: str
) -> list[dict]:
    """Export a conversation as a list of serialized messages."""
    conv_stmt = select(Conversation).where(Conversation.phone_number == phone_number)
    conv_result = await session.execute(conv_stmt)
    conv = conv_result.scalars().first()
    if not conv:
        return []

    msg_stmt = (
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.timestamp)
        .limit(MAX_EXPORT_MESSAGES)
    )
    result = await session.execute(msg_stmt)
    return [serialize_message(msg) for msg in result.scalars().all()]
