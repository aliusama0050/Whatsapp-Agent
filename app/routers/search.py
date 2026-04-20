from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.services.search_service import search_messages

router = APIRouter()


@router.get("/messages")
async def search_messages_endpoint(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    results, total = await search_messages(session, q, page, limit)
    return {"results": results, "total": total, "page": page, "limit": limit}
