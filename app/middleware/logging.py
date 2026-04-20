import logging
import time
import uuid
from contextvars import ContextVar
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger("hsq.access")

# Context var for request ID — accessible from any logger in the call stack
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestLoggingMiddleware:
    """Pure ASGI middleware — compatible with both HTTP and WebSocket."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Only log HTTP requests; let WebSocket pass through untouched
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        from starlette.requests import Request

        request = Request(scope)
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        request_id_var.set(rid)

        start = time.perf_counter()
        status_code = 500  # default in case of unhandled error

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                # Inject X-Request-ID header
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", rid.encode()))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_wrapper)

        duration_ms = round((time.perf_counter() - start) * 1000)
        if request.url.path != "/health":
            logger.info(
                "%s %s %s %dms [rid=%s]",
                request.method,
                request.url.path,
                status_code,
                duration_ms,
                rid,
            )
