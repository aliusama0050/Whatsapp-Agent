from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.services.conversation_service import get_conversation, update_last_message
from app.services.message_service import get_messages, store_message, serialize_message
from app.models.message import SendMessageRequest
from app.ws.manager import ws_manager
from app.whatsapp import send_message

router = APIRouter()


@router.get("/conversations/{phone_number}/messages")
async def list_messages(
    phone_number: str,
    before: str = Query(None),
    limit: int = Query(50, ge=1, le=100),
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    messages = await get_messages(session, phone_number, before, limit)
    return {
        "messages": [serialize_message(m) for m in messages],
        "has_more": len(messages) == limit,
    }


@router.post("/conversations/{phone_number}/messages")
async def send_manual_message(
    phone_number: str,
    body: SendMessageRequest,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await get_conversation(session, phone_number)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check 24-hour window
    window_expires = conv.window_expires_at
    if window_expires and window_expires.tzinfo is None:
        window_expires = window_expires.replace(tzinfo=timezone.utc)
    if window_expires and window_expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="24-hour messaging window expired. Use a template message to re-engage.",
        )

    sent_ok = await send_message(phone_number, body.body)

    msg = await store_message(
        session,
        conversation_id=conv.id,
        phone_number=phone_number,
        direction="outbound",
        sender_type="human_agent",
        body=body.body,
        sender_id=str(user.id),
        status="sent" if sent_ok else "failed",
    )

    await update_last_message(session, phone_number)
    await session.commit()

    await ws_manager.broadcast({
        "type": "new_message",
        "conversation_id": str(conv.id),
        "phone_number": phone_number,
        "message": serialize_message(msg),
    })

    return serialize_message(msg)
