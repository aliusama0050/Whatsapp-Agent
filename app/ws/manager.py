import asyncio
import json
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    def register(self, user_id: str, websocket: WebSocket):
        """Register an already-accepted WebSocket connection."""
        self.active_connections[user_id] = websocket
        logger.info("WebSocket connected: user %s (%d total)", user_id, len(self.active_connections))

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        logger.info("WebSocket disconnected: user %s", user_id)

    async def broadcast(self, data: dict):
        """Send event to all connected dashboard clients (concurrent)."""
        if not self.active_connections:
            return
        message = json.dumps(data, default=str)
        user_ids = list(self.active_connections.keys())
        results = await asyncio.gather(
            *(self.active_connections[uid].send_text(message) for uid in user_ids),
            return_exceptions=True,
        )
        for uid, result in zip(user_ids, results):
            if isinstance(result, Exception):
                self.disconnect(uid)


ws_manager = ConnectionManager()
