import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.services.export_service import export_conversation_csv_stream, export_conversation_json

router = APIRouter()


@router.get("/{phone_number}/export")
async def export_conversation(
    phone_number: str,
    format: str = Query("csv", pattern="^(csv|json)$"),
    _user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if format == "csv":
        return StreamingResponse(
            export_conversation_csv_stream(session, phone_number),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=conversation_{phone_number}.csv"},
        )
    else:
        messages = await export_conversation_json(session, phone_number)
        if not messages:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return Response(
            content=json.dumps(messages, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=conversation_{phone_number}.json"},
        )
