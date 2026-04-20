import logging

from sqlalchemy import select, func

from app.database import async_session_maker
from app.auth.security import hash_password
from app.config import ADMIN_USERNAME, ADMIN_PASSWORD
from app.models.db_models import User

logger = logging.getLogger(__name__)


async def seed_admin_user():
    """Auto-create admin user on startup if no users exist."""
    async with async_session_maker() as session:
        count = await session.scalar(select(func.count()).select_from(User))
        if count and count > 0:
            return

        if not ADMIN_PASSWORD:
            logger.warning("No ADMIN_PASSWORD set in .env — skipping admin seed")
            return

        admin = User(
            username=ADMIN_USERNAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
        )
        session.add(admin)
        await session.commit()
        logger.info("Admin user '%s' created", ADMIN_USERNAME)
