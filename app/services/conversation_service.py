import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, delete, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Conversation, ConversationNote, Message


async def find_or_create_conversation(
    session: AsyncSession, phone_number: str, customer_name: str
) -> Conversation:
    """Upsert a conversation, updating timestamps and window."""
    now = datetime.now(timezone.utc)
    window_expires = now + timedelta(hours=24)

    stmt = pg_insert(Conversation).values(
        id=uuid.uuid4(),
        phone_number=phone_number,
        customer_name=customer_name or "Unknown",
        agent_status="ai_active",
        agent_status_changed_at=now,
        last_message_at=now,
        last_customer_message_at=now,
        window_expires_at=window_expires,
        unread_count=1,
        tags=[],
        created_at=now,
        updated_at=now,
    ).on_conflict_do_update(
        index_elements=["phone_number"],
        set_={
            "customer_name": customer_name or "Unknown",
            "last_message_at": now,
            "last_customer_message_at": now,
            "window_expires_at": window_expires,
            "unread_count": Conversation.unread_count + 1,
            "updated_at": now,
        },
    ).returning(Conversation)

    result = await session.execute(stmt)
    conv = result.scalars().first()
    await session.flush()
    return conv


async def get_conversations(
    session: AsyncSession,
    page: int = 1,
    limit: int = 20,
    status_filter: str = None,
) -> tuple[list[dict], int]:
    """Get paginated conversations with last message preview."""
    query = select(Conversation)
    count_query = select(func.count()).select_from(Conversation)

    if status_filter:
        query = query.where(Conversation.agent_status == status_filter)
        count_query = count_query.where(Conversation.agent_status == status_filter)

    total = await session.scalar(count_query)
    skip = (page - 1) * limit

    query = query.order_by(Conversation.last_message_at.desc().nullslast())
    query = query.offset(skip).limit(limit)

    result = await session.execute(query)
    conversations = result.scalars().all()

    # Fetch last message preview for each conversation
    conv_list = []
    for conv in conversations:
        preview_stmt = (
            select(Message.content)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.timestamp.desc())
            .limit(1)
        )
        preview_result = await session.execute(preview_stmt)
        preview_row = preview_result.scalar_one_or_none()
        preview = None
        if preview_row:
            preview = (preview_row.get("body", "") or "")[:80]

        conv_list.append({
            "id": str(conv.id),
            "phone_number": conv.phone_number,
            "customer_name": conv.customer_name,
            "agent_status": conv.agent_status,
            "last_message_at": _utc_iso(conv.last_message_at),
            "last_customer_message_at": _utc_iso(conv.last_customer_message_at),
            "window_expires_at": _utc_iso(conv.window_expires_at),
            "unread_count": conv.unread_count,
            "tags": conv.tags or [],
            "last_message_preview": preview,
        })

    return conv_list, total


async def get_conversation(
    session: AsyncSession, phone_number: str
) -> Conversation | None:
    stmt = select(Conversation).where(Conversation.phone_number == phone_number)
    result = await session.execute(stmt)
    return result.scalars().first()


async def toggle_agent_status(
    session: AsyncSession, phone_number: str, new_status: str, user_id: str
) -> dict | None:
    """Toggle AI agent on/off for a specific phone number."""
    now = datetime.now(timezone.utc)
    stmt = (
        update(Conversation)
        .where(Conversation.phone_number == phone_number)
        .values(
            agent_status=new_status,
            agent_status_changed_at=now,
            agent_status_changed_by=uuid.UUID(user_id),
            updated_at=now,
        )
        .returning(Conversation)
    )
    result = await session.execute(stmt)
    conv = result.scalars().first()
    await session.flush()
    if not conv:
        return None
    return _serialize_conversation(conv)


async def mark_read(session: AsyncSession, phone_number: str):
    stmt = (
        update(Conversation)
        .where(Conversation.phone_number == phone_number)
        .values(unread_count=0)
    )
    await session.execute(stmt)
    await session.flush()


async def update_last_message(session: AsyncSession, phone_number: str):
    stmt = (
        update(Conversation)
        .where(Conversation.phone_number == phone_number)
        .values(last_message_at=datetime.now(timezone.utc))
    )
    await session.execute(stmt)
    await session.flush()


# ─── Tags ───

async def update_tags(
    session: AsyncSession, phone_number: str, tags: list[str]
) -> list[str]:
    stmt = (
        update(Conversation)
        .where(Conversation.phone_number == phone_number)
        .values(tags=tags, updated_at=datetime.now(timezone.utc))
        .returning(Conversation.tags)
    )
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    await session.flush()
    return row or []


# ─── Notes ───

async def add_note(
    session: AsyncSession,
    phone_number: str,
    text: str,
    user_id: str,
    user_name: str,
) -> dict:
    conv = await get_conversation(session, phone_number)
    if not conv:
        return {}

    note = ConversationNote(
        conversation_id=conv.id,
        text=text,
        created_by=user_id,
        created_by_name=user_name,
    )
    session.add(note)
    await session.flush()

    return {
        "id": str(note.id),
        "text": note.text,
        "created_by": note.created_by,
        "created_by_name": note.created_by_name,
        "created_at": _utc_iso(note.created_at),
    }


async def get_notes(session: AsyncSession, phone_number: str) -> list[dict]:
    conv = await get_conversation(session, phone_number)
    if not conv:
        return []

    stmt = (
        select(ConversationNote)
        .where(ConversationNote.conversation_id == conv.id)
        .order_by(ConversationNote.created_at.desc())
    )
    result = await session.execute(stmt)
    notes = result.scalars().all()

    return [
        {
            "id": str(n.id),
            "text": n.text,
            "created_by": n.created_by,
            "created_by_name": n.created_by_name,
            "created_at": _utc_iso(n.created_at),
        }
        for n in notes
    ]


async def delete_note(
    session: AsyncSession, phone_number: str, note_id: str
) -> bool:
    stmt = delete(ConversationNote).where(
        ConversationNote.id == uuid.UUID(note_id)
    )
    result = await session.execute(stmt)
    await session.flush()
    return result.rowcount > 0


# ─── Helpers ───

def _utc_iso(dt) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _serialize_conversation(conv: Conversation) -> dict:
    return {
        "id": str(conv.id),
        "phone_number": conv.phone_number,
        "customer_name": conv.customer_name,
        "agent_status": conv.agent_status,
        "last_message_at": _utc_iso(conv.last_message_at),
        "last_customer_message_at": _utc_iso(conv.last_customer_message_at),
        "window_expires_at": _utc_iso(conv.window_expires_at),
        "unread_count": conv.unread_count,
        "tags": conv.tags or [],
    }
