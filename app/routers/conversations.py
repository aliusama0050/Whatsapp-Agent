from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.services.conversation_service import (
    get_conversations,
    get_conversation,
    toggle_agent_status,
    mark_read,
    update_tags,
    add_note,
    get_notes,
    delete_note,
)
from app.models.conversation import AgentToggleRequest
from app.ws.manager import ws_manager


class TagsRequest(BaseModel):
    tags: list[str]


class NoteRequest(BaseModel):
    text: str

router = APIRouter()


@router.get("")
async def list_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None, pattern="^(ai_active|human_takeover)$"),
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conversations, total = await get_conversations(session, page, limit, status)
    return {
        "conversations": conversations,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/{phone_number}")
async def get_single_conversation(
    phone_number: str,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await get_conversation(session, phone_number)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    from app.services.conversation_service import _serialize_conversation
    return _serialize_conversation(conv)


@router.put("/{phone_number}/agent")
async def toggle_agent(
    phone_number: str,
    body: AgentToggleRequest,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await get_conversation(session, phone_number)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conv.agent_status == body.status:
        return {"message": "Status unchanged", "status": body.status}

    await toggle_agent_status(session, phone_number, body.status, str(user.id))
    await session.commit()

    await ws_manager.broadcast({
        "type": "agent_status_changed",
        "phone_number": phone_number,
        "status": body.status,
        "changed_by": user.username,
    })

    return {"message": f"Agent status changed to {body.status}", "status": body.status}


@router.put("/{phone_number}/read")
async def mark_conversation_read(
    phone_number: str,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await mark_read(session, phone_number)
    await session.commit()
    return {"message": "Marked as read"}


# ─── Tags ───

@router.put("/{phone_number}/tags")
async def set_tags(
    phone_number: str,
    body: TagsRequest,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await get_conversation(session, phone_number)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    tags = await update_tags(session, phone_number, body.tags)
    await session.commit()
    return {"tags": tags}


# ─── Notes ───

@router.get("/{phone_number}/notes")
async def list_notes(
    phone_number: str,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    notes = await get_notes(session, phone_number)
    return {"notes": notes}


@router.post("/{phone_number}/notes")
async def create_note(
    phone_number: str,
    body: NoteRequest,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await get_conversation(session, phone_number)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    note = await add_note(session, phone_number, body.text, str(user.id), user.username)
    await session.commit()
    return note


@router.delete("/{phone_number}/notes/{note_id}")
async def remove_note(
    phone_number: str,
    note_id: str,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    deleted = await delete_note(session, phone_number, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    await session.commit()
    return {"ok": True}
