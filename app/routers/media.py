from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.services.media_service import upload_media_to_whatsapp, upload_to_cloudinary
from app.services.conversation_service import get_conversation, update_last_message
from app.services.message_service import store_message, serialize_message
from app.whatsapp import send_media_message
from app.ws.manager import ws_manager

router = APIRouter()

MAX_FILE_SIZE = 16 * 1024 * 1024  # 16 MB


def _media_type_from_mime(mime: str) -> str:
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("video/"):
        return "video"
    if mime.startswith("audio/"):
        return "audio"
    return "document"


@router.post("/conversations/{phone_number}/send")
async def upload_and_send_media(
    phone_number: str,
    file: UploadFile = File(...),
    caption: str = Form(""),
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await get_conversation(session, phone_number)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check 24h window
    window_expires = conv.window_expires_at
    if window_expires and window_expires.tzinfo is None:
        window_expires = window_expires.replace(tzinfo=timezone.utc)
    if window_expires and window_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="24-hour messaging window expired.")

    content_type = file.content_type or "application/octet-stream"
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 16MB)")

    media_type = _media_type_from_mime(content_type)

    wa_media_id = await upload_media_to_whatsapp(file_bytes, content_type, file.filename or "file")
    if not wa_media_id:
        raise HTTPException(status_code=502, detail="Failed to upload media to WhatsApp")

    cloudinary_url = await upload_to_cloudinary(file_bytes, wa_media_id, content_type) or ""

    sent_ok = await send_media_message(phone_number, media_type, wa_media_id, caption or None)

    msg = await store_message(
        session,
        conversation_id=conv.id,
        phone_number=phone_number,
        direction="outbound",
        sender_type="human_agent",
        message_type=media_type,
        sender_id=str(user.id),
        status="sent" if sent_ok else "failed",
        content={
            "body": caption,
            "media_id": wa_media_id,
            "mime_type": content_type,
            "filename": file.filename or "",
            "cloudinary_url": cloudinary_url,
        },
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
