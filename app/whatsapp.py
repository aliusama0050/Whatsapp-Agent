import logging
import httpx
from app.config import WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID

logger = logging.getLogger(__name__)

API_URL = f"https://graph.facebook.com/v22.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"

HEADERS = {
    "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
    "Content-Type": "application/json",
}

client = httpx.AsyncClient(timeout=30.0)


async def send_message(to: str, body: str) -> bool:
    """Send a text message via WhatsApp Cloud API. Returns True on success, False on failure."""
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body},
    }
    try:
        resp = await client.post(API_URL, headers=HEADERS, json=payload)
        resp.raise_for_status()
        logger.info("Message sent to %s", to)
        return True
    except httpx.HTTPStatusError as e:
        logger.error("WhatsApp API error %s: %s", e.response.status_code, e.response.text)
        return False
    except httpx.RequestError as e:
        logger.error("WhatsApp request failed: %s", e)
        return False


async def send_template_message(
    to: str,
    template_name: str,
    language_code: str = "en",
    components: list[dict] | None = None,
) -> bool:
    """Send a template message via WhatsApp Cloud API. Works outside 24h window."""
    template = {
        "name": template_name,
        "language": {"code": language_code},
    }
    if components:
        template["components"] = components

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": template,
    }
    try:
        resp = await client.post(API_URL, headers=HEADERS, json=payload)
        resp.raise_for_status()
        logger.info("Template '%s' sent to %s", template_name, to)
        return True
    except httpx.HTTPStatusError as e:
        logger.error("WhatsApp template API error %s: %s", e.response.status_code, e.response.text)
        return False
    except httpx.RequestError as e:
        logger.error("WhatsApp template request failed: %s", e)
        return False


async def send_media_message(
    to: str,
    media_type: str,
    media_id: str,
    caption: str | None = None,
) -> bool:
    """Send a media message via WhatsApp Cloud API. media_type: image, video, audio, document."""
    media_obj: dict = {"id": media_id}
    if caption:
        media_obj["caption"] = caption

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": media_type,
        media_type: media_obj,
    }
    try:
        resp = await client.post(API_URL, headers=HEADERS, json=payload)
        resp.raise_for_status()
        logger.info("Media (%s) sent to %s", media_type, to)
        return True
    except httpx.HTTPStatusError as e:
        logger.error("WhatsApp media send error %s: %s", e.response.status_code, e.response.text)
        return False
    except httpx.RequestError as e:
        logger.error("WhatsApp media send failed: %s", e)
        return False
