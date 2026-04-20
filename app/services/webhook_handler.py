import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database import async_session_maker
from app.models.db_models import ProcessedMessageId
from app.services.conversation_service import find_or_create_conversation, update_last_message
from app.services.message_service import store_message, update_message_status, serialize_message, get_recent_history
from app.services.media_service import download_whatsapp_media
from app.ws.manager import ws_manager
from app.agent import get_ai_response, SYSTEM_PROMPT, FALLBACK_MESSAGE
from app.services.ai_config_service import get_ai_config
from app.whatsapp import send_message
from app.services.contact_service import auto_create_contact

logger = logging.getLogger(__name__)

SUPPORTED_MEDIA_TYPES = {"image", "video", "audio", "document", "sticker"}


async def process_webhook(body: dict) -> None:
    """Process incoming webhook from Meta — runs as background task."""
    try:
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})

                if "statuses" in value:
                    await _handle_statuses(value["statuses"])
                    continue

                messages = value.get("messages")
                if not messages:
                    continue

                contacts = value.get("contacts", [])
                for msg in messages:
                    await _handle_message(msg, contacts)

    except Exception as e:
        logger.error("Error processing webhook: %s", e, exc_info=True)


async def _handle_message(msg: dict, contacts: list) -> None:
    """Process a single incoming message."""
    msg_type = msg.get("type", "")
    is_text = msg_type == "text"
    is_media = msg_type in SUPPORTED_MEDIA_TYPES

    if not is_text and not is_media:
        logger.info("Skipping unsupported message type: %s", msg_type)
        return

    msg_id = msg.get("id", "")

    # Deduplication via PostgreSQL ON CONFLICT
    async with async_session_maker() as session:
        stmt = pg_insert(ProcessedMessageId).values(
            id=msg_id,
            processed_at=datetime.now(timezone.utc),
        ).on_conflict_do_nothing(index_elements=["id"])
        result = await session.execute(stmt)
        await session.commit()

        if result.rowcount == 0:
            logger.info("Duplicate message %s, skipping", msg_id)
            return

    sender = msg["from"]
    user_name = ""
    if contacts:
        user_name = contacts[0].get("profile", {}).get("name", "")

    async with async_session_maker() as session:
        conversation = await find_or_create_conversation(session, sender, user_name)
        await auto_create_contact(session, sender, user_name)
        await session.commit()

        if is_text:
            await _handle_text_message(session, msg, msg_id, sender, user_name, conversation)
        elif is_media:
            await _handle_media_message(session, msg, msg_type, msg_id, sender, user_name, conversation)

        await session.commit()


async def _handle_text_message(
    session, msg: dict, msg_id: str, sender: str, user_name: str, conversation
) -> None:
    """Process an inbound text message."""
    text = msg["text"]["body"]
    logger.info("Text from %s (%s): %s", user_name, sender, text)

    inbound_msg = await store_message(
        session,
        conversation_id=conversation.id,
        phone_number=sender,
        direction="inbound",
        sender_type="customer",
        body=text,
        whatsapp_message_id=msg_id,
        status="received",
    )

    await ws_manager.broadcast({
        "type": "new_message",
        "conversation_id": str(conversation.id),
        "phone_number": sender,
        "customer_name": user_name,
        "message": serialize_message(inbound_msg),
    })

    if conversation.agent_status == "human_takeover":
        logger.info("AI disabled for %s — skipping auto-response", sender)
        return

    config = await get_ai_config(session)
    system_prompt = config.get("system_prompt") or SYSTEM_PROMPT
    fallback = config.get("fallback_message") or FALLBACK_MESSAGE

    knowledge = config.get("knowledge_entries", [])
    if knowledge:
        entries_text = "\n\n## Additional Knowledge\n" + "\n".join(
            f"### {e['title']}\n{e['content']}" for e in knowledge
        )
        system_prompt += entries_text

    # Fetch recent conversation history for context (exclude current msg)
    history = await get_recent_history(session, conversation.id, limit=20)
    # Remove current message from history (it was just stored above)
    history = [h for h in history if h["body"] != text or h["direction"] != "inbound"]

    reply = await asyncio.to_thread(get_ai_response, text, user_name, system_prompt, fallback, history)
    sent_ok = await send_message(sender, reply)

    outbound_msg = await store_message(
        session,
        conversation_id=conversation.id,
        phone_number=sender,
        direction="outbound",
        sender_type="ai_agent",
        body=reply,
        status="sent" if sent_ok else "failed",
    )

    await update_last_message(session, sender)

    await ws_manager.broadcast({
        "type": "new_message",
        "conversation_id": str(conversation.id),
        "phone_number": sender,
        "message": serialize_message(outbound_msg),
    })


async def _handle_media_message(
    session, msg: dict, msg_type: str, msg_id: str, sender: str, user_name: str, conversation
) -> None:
    """Process an inbound media message."""
    media_data = msg.get(msg_type, {})
    media_id = media_data.get("id", "")
    mime_type = media_data.get("mime_type", "")
    caption = media_data.get("caption", "")
    filename = media_data.get("filename", "")

    logger.info("Media (%s) from %s (%s): media_id=%s", msg_type, user_name, sender, media_id)

    cloudinary_url = ""
    if media_id:
        result = await download_whatsapp_media(media_id)
        if result:
            cloudinary_url = result.get("cloudinary_url", "")

    inbound_msg = await store_message(
        session,
        conversation_id=conversation.id,
        phone_number=sender,
        direction="inbound",
        sender_type="customer",
        message_type=msg_type,
        whatsapp_message_id=msg_id,
        status="received",
        content={
            "body": caption,
            "media_id": media_id,
            "mime_type": mime_type,
            "filename": filename,
            "cloudinary_url": cloudinary_url,
        },
    )

    await ws_manager.broadcast({
        "type": "new_message",
        "conversation_id": str(conversation.id),
        "phone_number": sender,
        "customer_name": user_name,
        "message": serialize_message(inbound_msg),
    })

    if conversation.agent_status == "human_takeover":
        logger.info("AI disabled for %s — skipping auto-response", sender)
        return

    media_labels = {
        "image": "image", "video": "video", "audio": "voice message",
        "document": "document", "sticker": "sticker",
    }
    label = media_labels.get(msg_type, "file")
    reply = f"Thank you for sending the {label}. I've noted it and a team member will review it shortly. Is there anything else I can help you with?"

    sent_ok = await send_message(sender, reply)

    outbound_msg = await store_message(
        session,
        conversation_id=conversation.id,
        phone_number=sender,
        direction="outbound",
        sender_type="ai_agent",
        body=reply,
        status="sent" if sent_ok else "failed",
    )

    await update_last_message(session, sender)

    await ws_manager.broadcast({
        "type": "new_message",
        "conversation_id": str(conversation.id),
        "phone_number": sender,
        "message": serialize_message(outbound_msg),
    })


async def _handle_statuses(statuses: list) -> None:
    """Handle delivery status updates from Meta."""
    async with async_session_maker() as session:
        for status_update in statuses:
            msg_id = status_update.get("id")
            new_status = status_update.get("status")
            if msg_id and new_status:
                await update_message_status(session, msg_id, new_status)
                await ws_manager.broadcast({
                    "type": "message_status",
                    "whatsapp_message_id": msg_id,
                    "status": new_status,
                })
        await session.commit()
