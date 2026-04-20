import uuid
from datetime import datetime, timezone

from sqlalchemy import select, delete as sa_delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import CannedResponse


def _serialize(cr: CannedResponse) -> dict:
    return {
        "id": str(cr.id),
        "shortcut": cr.shortcut,
        "title": cr.title,
        "body": cr.body,
        "category": cr.category or "General",
        "created_by": cr.created_by or "",
        "created_at": cr.created_at.isoformat() if cr.created_at else None,
        "updated_at": cr.updated_at.isoformat() if cr.updated_at else None,
    }


async def list_canned_responses(
    session: AsyncSession, category: str | None = None
) -> list[dict]:
    query = select(CannedResponse)
    if category:
        query = query.where(CannedResponse.category == category)
    query = query.order_by(CannedResponse.shortcut)

    result = await session.execute(query)
    return [_serialize(cr) for cr in result.scalars().all()]


async def get_canned_response(
    session: AsyncSession, response_id: str
) -> dict | None:
    stmt = select(CannedResponse).where(CannedResponse.id == uuid.UUID(response_id))
    result = await session.execute(stmt)
    cr = result.scalars().first()
    return _serialize(cr) if cr else None


async def create_canned_response(
    session: AsyncSession, data: dict, created_by: str
) -> dict:
    cr = CannedResponse(
        shortcut=data["shortcut"].strip().lower(),
        title=data["title"].strip(),
        body=data["body"],
        category=data.get("category", "General").strip(),
        created_by=created_by,
    )
    session.add(cr)
    await session.flush()
    return _serialize(cr)


async def update_canned_response(
    session: AsyncSession, response_id: str, data: dict
) -> dict | None:
    updates = {k: v for k, v in data.items() if v is not None}
    if "shortcut" in updates:
        updates["shortcut"] = updates["shortcut"].strip().lower()
    if "title" in updates:
        updates["title"] = updates["title"].strip()
    if "category" in updates:
        updates["category"] = updates["category"].strip()
    updates["updated_at"] = datetime.now(timezone.utc)

    stmt = (
        update(CannedResponse)
        .where(CannedResponse.id == uuid.UUID(response_id))
        .values(**updates)
        .returning(CannedResponse)
    )
    result = await session.execute(stmt)
    cr = result.scalars().first()
    await session.flush()
    return _serialize(cr) if cr else None


async def delete_canned_response(
    session: AsyncSession, response_id: str
) -> bool:
    stmt = sa_delete(CannedResponse).where(
        CannedResponse.id == uuid.UUID(response_id)
    )
    result = await session.execute(stmt)
    await session.flush()
    return result.rowcount > 0
