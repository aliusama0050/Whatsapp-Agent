from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.services.analytics_service import get_analytics_overview

router = APIRouter()

PERIOD_MAP = {"7d": 7, "30d": 30, "90d": 90}


@router.get("/overview")
async def overview(
    period: str = Query("7d", pattern="^(7d|30d|90d)$"),
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    days = PERIOD_MAP[period]
    data = await get_analytics_overview(session, days)
    return data
