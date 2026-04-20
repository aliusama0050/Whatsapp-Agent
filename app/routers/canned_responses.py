from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.models.canned_response import CannedResponseCreate, CannedResponseUpdate
from app.services.canned_response_service import (
    list_canned_responses,
    get_canned_response,
    create_canned_response,
    update_canned_response,
    delete_canned_response,
)

router = APIRouter()


@router.get("/")
async def list_responses(
    category: str | None = Query(None),
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    responses = await list_canned_responses(session, category)
    return {"canned_responses": responses}


@router.post("/")
async def create_response(
    body: CannedResponseCreate,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        resp = await create_canned_response(session, body.model_dump(), created_by=str(user.id))
        await session.commit()
        return resp
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=409, detail="Shortcut already exists")
        raise


@router.put("/{response_id}")
async def update_response(
    response_id: str,
    body: CannedResponseUpdate,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await update_canned_response(session, response_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Canned response not found")
    await session.commit()
    return result


@router.delete("/{response_id}")
async def delete_response(
    response_id: str,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    deleted = await delete_canned_response(session, response_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Canned response not found")
    await session.commit()
    return {"ok": True}
