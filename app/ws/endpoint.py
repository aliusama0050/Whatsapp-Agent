import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.auth.security import decode_access_token
from app.ws.manager import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/messages")
async def websocket_endpoint(websocket: WebSocket):
    # Accept the connection
    await websocket.accept()

    # Wait for auth message: {"type": "auth", "token": "..."}
    try:
        raw = await websocket.receive_text()
        msg = json.loads(raw)
        if msg.get("type") != "auth" or not msg.get("token"):
            await websocket.close(code=4001, reason="Expected auth message")
            return
        payload = decode_access_token(msg["token"])
        user_id = payload["sub"]
    except WebSocketDisconnect:
        return
    except Exception:
        try:
            await websocket.close(code=4001, reason="Invalid token")
        except RuntimeError:
            pass
        return

    # Register connection (already accepted above)
    ws_manager.register(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
