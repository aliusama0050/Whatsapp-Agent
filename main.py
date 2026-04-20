import asyncio
import hashlib
import hmac
import json
import logging
from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.config import (
    WEBHOOK_VERIFY_TOKEN,
    WHATSAPP_APP_SECRET,
    CORS_ALLOWED_ORIGINS,
    ENVIRONMENT,
    validate_config,
)
from app.database import init_db, close_db, async_session_maker
from app.scripts.seed_admin import seed_admin_user
from app.services.webhook_handler import process_webhook
from app.services.cleanup_service import periodic_cleanup
from app.routers import (
    auth, conversations, messages, dashboard, users,
    templates, media, canned_responses, ai_config,
    analytics, contacts, search, export, admin,
)
from app.ws.endpoint import router as ws_router
from app.middleware.logging import RequestLoggingMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Validate required env vars before anything else
validate_config()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await seed_admin_user()
    # Start periodic cleanup (TTL replacement)
    cleanup_task = asyncio.create_task(periodic_cleanup())
    logger.info("Server started (env=%s)", ENVIRONMENT)
    yield
    # Shutdown — cancel cleanup
    cleanup_task.cancel()
    # Close HTTP clients
    from app.whatsapp import client as wa_client
    from app.services.media_service import client as media_client
    from app.services.template_service import client as tmpl_client
    for c in (wa_client, media_client, tmpl_client):
        await c.aclose()
    await close_db()
    logger.info("Server stopped")


app = FastAPI(title="HSQ Towers WhatsApp Dashboard", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(RequestLoggingMiddleware)


# ─── Global exception handler — prevent stack trace leakage ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# CORS — restricted to frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Mount API routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(messages.router, prefix="/api", tags=["messages"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(media.router, prefix="/api/media", tags=["media"])
app.include_router(canned_responses.router, prefix="/api/canned-responses", tags=["canned-responses"])
app.include_router(ai_config.router, prefix="/api/ai-config", tags=["ai-config"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(export.router, prefix="/api/conversations", tags=["export"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(ws_router)


# ─── Health check ───

@app.get("/health")
async def health_check():
    try:
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable"})


# ─── Webhook routes (no auth — Meta needs direct access) ───

def _verify_signature(raw_body: bytes, signature_header: str | None) -> bool:
    # Skip verification if no real secret is configured
    if not WHATSAPP_APP_SECRET or len(WHATSAPP_APP_SECRET) < 16:
        return True
    if not signature_header:
        return False
    expected = hmac.new(
        WHATSAPP_APP_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature_header)


@app.get("/webhook")
async def verify_webhook(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and hmac.compare_digest(token or "", WEBHOOK_VERIFY_TOKEN):
        logger.info("Webhook verified")
        return Response(content=challenge, media_type="text/plain")

    logger.warning("Webhook verification failed")
    return Response(content="Forbidden", status_code=403)


@app.post("/webhook")
@limiter.limit("100/minute")
async def receive_webhook(request: Request):
    raw_body = await request.body()

    signature = request.headers.get("X-Hub-Signature-256")
    if not _verify_signature(raw_body, signature):
        logger.warning("Webhook signature verification failed")
        return Response(content="Forbidden", status_code=403)

    body = json.loads(raw_body)

    asyncio.create_task(process_webhook(body))
    return Response(status_code=200)


# ─── Serve frontend static files (production) ───
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve React SPA — all non-API routes return index.html."""
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    from app.config import PORT

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=ENVIRONMENT == "development")
