from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.models.contact import ContactUpdate
from app.services.contact_service import get_contacts, get_contact, upsert_contact, delete_contact

router = APIRouter()


@router.get("/")
async def list_contacts(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    contacts, total = await get_contacts(session, search, page, limit)
    return {"contacts": contacts, "total": total, "page": page, "limit": limit}


@router.get("/{phone_number}")
async def get_single_contact(
    phone_number: str,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    contact = await get_contact(session, phone_number)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.put("/{phone_number}")
async def update_contact_endpoint(
    phone_number: str,
    body: ContactUpdate,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await upsert_contact(session, phone_number, body.model_dump(exclude_none=True))
    await session.commit()
    return result


@router.delete("/{phone_number}")
async def delete_contact_endpoint(
    phone_number: str,
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    deleted = await delete_contact(session, phone_number)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contact not found")
    await session.commit()
    return {"ok": True}
