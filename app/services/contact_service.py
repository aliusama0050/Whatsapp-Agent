import uuid
from datetime import datetime, timezone

from sqlalchemy import select, delete as sa_delete, func, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Contact


def _serialize(c: Contact) -> dict:
    return {
        "id": str(c.id),
        "phone_number": c.phone_number,
        "name": c.name or "",
        "email": c.email or "",
        "company": c.company or "",
        "notes": c.notes or "",
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


async def get_contacts(
    session: AsyncSession,
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[dict], int]:
    query = select(Contact)
    count_query = select(func.count()).select_from(Contact)

    if search:
        pattern = f"%{search}%"
        filter_clause = or_(
            Contact.name.ilike(pattern),
            Contact.phone_number.ilike(pattern),
            Contact.email.ilike(pattern),
        )
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    total = await session.scalar(count_query)
    query = query.order_by(Contact.name).offset((page - 1) * limit).limit(limit)

    result = await session.execute(query)
    contacts = [_serialize(c) for c in result.scalars().all()]
    return contacts, total


async def get_contact(session: AsyncSession, phone_number: str) -> dict | None:
    stmt = select(Contact).where(Contact.phone_number == phone_number)
    result = await session.execute(stmt)
    c = result.scalars().first()
    return _serialize(c) if c else None


async def upsert_contact(
    session: AsyncSession, phone_number: str, data: dict
) -> dict:
    now = datetime.now(timezone.utc)
    updates = {k: v for k, v in data.items() if v is not None}
    updates["updated_at"] = now

    stmt = pg_insert(Contact).values(
        id=uuid.uuid4(),
        phone_number=phone_number,
        name=updates.get("name", ""),
        email=updates.get("email", ""),
        company=updates.get("company", ""),
        notes=updates.get("notes", ""),
        created_at=now,
        updated_at=now,
    ).on_conflict_do_update(
        index_elements=["phone_number"],
        set_=updates,
    ).returning(Contact)

    result = await session.execute(stmt)
    contact = result.scalars().first()
    await session.flush()
    return _serialize(contact)


async def delete_contact(session: AsyncSession, phone_number: str) -> bool:
    stmt = sa_delete(Contact).where(Contact.phone_number == phone_number)
    result = await session.execute(stmt)
    await session.flush()
    return result.rowcount > 0


async def auto_create_contact(
    session: AsyncSession, phone_number: str, name: str
) -> None:
    """Auto-create a contact on new conversation if not exists."""
    now = datetime.now(timezone.utc)
    stmt = pg_insert(Contact).values(
        id=uuid.uuid4(),
        phone_number=phone_number,
        name=name or "",
        email="",
        company="",
        notes="",
        created_at=now,
        updated_at=now,
    ).on_conflict_do_nothing(index_elements=["phone_number"])
    await session.execute(stmt)
    await session.flush()
