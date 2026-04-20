from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.services.template_service import list_templates
from app.services.conversation_service import get_conversation, update_last_message
from app.services.message_service import store_message, serialize_message
from app.whatsapp import send_template_message
from app.ws.manager import ws_manager

router = APIRouter()


class SendTemplateRequest(BaseModel):
    template_name: str
    language_code: str = "en"
    components: list[dict] = []


@router.get("/")
async def get_templates(_user=Depends(get_current_user)):
    templates = await list_templates()
    return {"templates": templates}


@router.post("/{phone_number}/send")
async def send_template(
    phone_number: str,
    body: SendTemplateRequest,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await get_conversation(session, phone_number)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    sent_ok = await send_template_message(
        to=phone_number,
        template_name=body.template_name,
        language_code=body.language_code,
        components=body.components or None,
    )

    preview_body = f"[Template: {body.template_name}]"

    msg = await store_message(
        session,
        conversation_id=conv.id,
        phone_number=phone_number,
        direction="outbound",
        sender_type="human_agent",
        message_type="template",
        sender_id=str(user.id),
        status="sent" if sent_ok else "failed",
        content={
            "body": preview_body,
            "template_name": body.template_name,
            "template_language": body.language_code,
            "components": body.components,
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
