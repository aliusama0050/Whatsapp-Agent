import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Message, Conversation


async def store_message(
    session: AsyncSession,
    conversation_id,
    phone_number: str,
    direction: str,
    sender_type: str,
    body: str = "",
    message_type: str = "text",
    whatsapp_message_id: str = None,
    sender_id: str = None,
    status: str = "sent",
    content: dict = None,
) -> Message:
    """Store a message in PostgreSQL."""
    if content is None:
        content = {"body": body}

    msg = Message(
        conversation_id=uuid.UUID(str(conversation_id)),
        phone_number=phone_number,
        direction=direction,
        sender_type=sender_type,
        sender_id=uuid.UUID(sender_id) if sender_id else None,
        message_type=message_type,
        content=content,
        status=status,
        whatsapp_message_id=whatsapp_message_id or None,
    )
    session.add(msg)
    await session.flush()
    return msg


async def get_messages(
    session: AsyncSession,
    phone_number: str,
    before: str = None,
    limit: int = 50,
) -> list[Message]:
    """Get messages for a conversation, cursor-paginated (newest first)."""
    # Find conversation
    conv_stmt = select(Conversation).where(Conversation.phone_number == phone_number)
    conv_result = await session.execute(conv_stmt)
    conv = conv_result.scalars().first()
    if not conv:
        return []

    query = select(Message).where(Message.conversation_id == conv.id)

    if before:
        # Cursor: get messages older than the given message ID
        cursor_stmt = select(Message.timestamp).where(Message.id == uuid.UUID(before))
        cursor_result = await session.execute(cursor_stmt)
        cursor_ts = cursor_result.scalar_one_or_none()
        if cursor_ts:
            query = query.where(Message.timestamp < cursor_ts)

    query = query.order_by(Message.timestamp.desc()).limit(limit)

    result = await session.execute(query)
    messages = list(result.scalars().all())
    messages.reverse()  # Return in chronological order
    return messages


async def get_recent_history(
    session: AsyncSession, conversation_id, limit: int = 20
) -> list[dict]:
    """Get conversation history for AI context.

    Strategy: all messages from today (full session context) + last 5
    older messages for continuity. Capped at `limit` total.
    """
    from datetime import datetime, timezone, timedelta

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # All of today's messages
    today_query = (
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.message_type == "text",
            Message.timestamp >= today_start,
        )
        .order_by(Message.timestamp.asc())
    )
    today_result = await session.execute(today_query)
    today_msgs = list(today_result.scalars().all())

    # Last 5 older messages for continuity (before today)
    older_query = (
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.message_type == "text",
            Message.timestamp < today_start,
        )
        .order_by(Message.timestamp.desc())
        .limit(5)
    )
    older_result = await session.execute(older_query)
    older_msgs = list(older_result.scalars().all())
    older_msgs.reverse()

    # Combine: older context + today's full session, capped
    all_msgs = (older_msgs + today_msgs)[-limit:]

    now = datetime.now(timezone.utc)
    return [
        {
            "direction": m.direction,
            "body": (m.content or {}).get("body", ""),
            "minutes_ago": int((now - m.timestamp).total_seconds() / 60) if m.timestamp else 9999,
        }
        for m in all_msgs
        if (m.content or {}).get("body")
    ]


async def update_message_status(
    session: AsyncSession, whatsapp_message_id: str, new_status: str
):
    """Update delivery status of a message."""
    stmt = (
        update(Message)
        .where(Message.whatsapp_message_id == whatsapp_message_id)
        .values(status=new_status)
    )
    await session.execute(stmt)
    await session.flush()


def _utc_iso(dt) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def serialize_message(msg) -> dict:
    """Convert a Message ORM object (or dict-like) to a JSON-safe dict."""
    # Support both ORM objects and dicts (for backward compat)
    if isinstance(msg, dict):
        content = msg.get("content", {})
        message_type = msg.get("message_type", "text")
        result = {
            "id": str(msg.get("id", msg.get("_id", ""))),
            "phone_number": msg.get("phone_number", ""),
            "direction": msg.get("direction", ""),
            "sender_type": msg.get("sender_type", ""),
            "message_type": message_type,
            "body": content.get("body", ""),
            "status": msg.get("status", "sent"),
            "whatsapp_message_id": msg.get("whatsapp_message_id"),
            "timestamp": _utc_iso(msg.get("timestamp")),
        }
    else:
        content = msg.content or {}
        message_type = msg.message_type or "text"
        result = {
            "id": str(msg.id),
            "phone_number": msg.phone_number,
            "direction": msg.direction,
            "sender_type": msg.sender_type,
            "message_type": message_type,
            "body": content.get("body", ""),
            "status": msg.status or "sent",
            "whatsapp_message_id": msg.whatsapp_message_id,
            "timestamp": _utc_iso(msg.timestamp),
        }

    # Template messages
    if message_type == "template":
        result["template_name"] = content.get("template_name", "")
        result["template_language"] = content.get("template_language", "")
        result["template_components"] = content.get("components", [])

    # Media messages
    if message_type in ("image", "video", "audio", "document", "sticker"):
        result["media_url"] = content.get("cloudinary_url") or None
        result["media_type"] = message_type
        result["mime_type"] = content.get("mime_type", "")
        result["filename"] = content.get("filename", "")

    return result
