import logging
import httpx
from app.config import WHATSAPP_ACCESS_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID

logger = logging.getLogger(__name__)

HEADERS = {
    "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
}

client = httpx.AsyncClient(timeout=30.0)


async def list_templates() -> list[dict]:
    """Fetch approved message templates from Meta Graph API."""
    if not WHATSAPP_BUSINESS_ACCOUNT_ID:
        logger.warning("WHATSAPP_BUSINESS_ACCOUNT_ID not set — cannot list templates")
        return []

    url = f"https://graph.facebook.com/v22.0/{WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates"
    params = {"status": "APPROVED", "limit": 100}

    try:
        resp = await client.get(url, headers=HEADERS, params=params)
        resp.raise_for_status()
        data = resp.json()
        templates = data.get("data", [])
        logger.info("Fetched %d approved templates", len(templates))
        return templates
    except httpx.HTTPStatusError as e:
        logger.error("Meta template API error %s: %s", e.response.status_code, e.response.text)
        return []
    except httpx.RequestError as e:
        logger.error("Meta template API request failed: %s", e)
        return []
