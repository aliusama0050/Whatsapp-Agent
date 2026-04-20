"""
Periodic cleanup for expired rows — replaces MongoDB TTL indexes.

Deletes:
- processed_message_ids older than 7 days
- refresh_tokens past their expires_at
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, text

from app.database import async_session_maker
from app.models.db_models import ProcessedMessageId, RefreshToken

logger = logging.getLogger(__name__)


async def periodic_cleanup():
    """Run cleanup every hour. Start as a background task in main.py lifespan."""
    while True:
        await asyncio.sleep(3600)
        try:
            async with async_session_maker() as session:
                cutoff = datetime.now(timezone.utc) - timedelta(days=7)
                r1 = await session.execute(
                    delete(ProcessedMessageId).where(
                        ProcessedMessageId.processed_at < cutoff
                    )
                )
                r2 = await session.execute(
                    delete(RefreshToken).where(
                        RefreshToken.expires_at < datetime.now(timezone.utc)
                    )
                )
                await session.commit()
                logger.info(
                    "Cleanup: removed %d dedup rows, %d expired tokens",
                    r1.rowcount,
                    r2.rowcount,
                )
        except Exception:
            logger.exception("Cleanup task failed")
