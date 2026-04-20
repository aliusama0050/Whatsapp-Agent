import io
import logging
import asyncio
import httpx
import cloudinary
import cloudinary.uploader
from app.config import (
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
)

logger = logging.getLogger(__name__)

# Configure Cloudinary
cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)

HEADERS = {
    "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
}

client = httpx.AsyncClient(timeout=60.0)


def _cloudinary_resource_type(mime_type: str) -> str:
    """Map MIME type to Cloudinary resource_type."""
    if mime_type.startswith("image/"):
        return "image"
    if mime_type.startswith("video/"):
        return "video"
    # audio, documents, stickers → "raw" in Cloudinary
    return "raw"


def _upload_to_cloudinary(file_bytes: bytes, media_id: str, mime_type: str) -> str | None:
    """Upload bytes to Cloudinary. Returns secure_url or None.

    This is a synchronous call — run via asyncio.to_thread().
    """
    resource_type = _cloudinary_resource_type(mime_type)
    try:
        result = cloudinary.uploader.upload(
            io.BytesIO(file_bytes),
            public_id=media_id,
            folder="hsq-media",
            resource_type=resource_type,
            overwrite=True,
        )
        url = result.get("secure_url", "")
        logger.info("Uploaded to Cloudinary: %s (%s)", media_id, url)
        return url
    except Exception as e:
        logger.error("Cloudinary upload failed for %s: %s", media_id, e)
        return None


async def upload_to_cloudinary(file_bytes: bytes, media_id: str, mime_type: str) -> str | None:
    """Async wrapper — uploads bytes to Cloudinary via thread pool."""
    return await asyncio.to_thread(_upload_to_cloudinary, file_bytes, media_id, mime_type)


async def download_whatsapp_media(media_id: str) -> dict | None:
    """Download media from WhatsApp Cloud API and upload to Cloudinary.

    Returns metadata dict with cloudinary_url, or None on failure.
    """
    try:
        # Step 1: Get media URL from Meta
        meta_url = f"https://graph.facebook.com/v22.0/{media_id}"
        resp = await client.get(meta_url, headers=HEADERS)
        resp.raise_for_status()
        meta = resp.json()

        download_url = meta.get("url")
        mime_type = meta.get("mime_type", "application/octet-stream")
        file_size = meta.get("file_size", 0)

        if not download_url:
            logger.error("No download URL for media %s", media_id)
            return None

        # Step 2: Download raw bytes
        file_resp = await client.get(download_url, headers=HEADERS)
        file_resp.raise_for_status()

        # Step 3: Upload to Cloudinary
        cloudinary_url = await upload_to_cloudinary(file_resp.content, media_id, mime_type)

        logger.info("Processed media %s (%s, %d bytes)", media_id, mime_type, len(file_resp.content))
        return {
            "media_id": media_id,
            "mime_type": mime_type,
            "file_size": file_size,
            "cloudinary_url": cloudinary_url or "",
        }

    except httpx.HTTPStatusError as e:
        logger.error("WhatsApp media API error %s: %s", e.response.status_code, e.response.text)
        return None
    except httpx.RequestError as e:
        logger.error("WhatsApp media download failed: %s", e)
        return None


async def upload_media_to_whatsapp(file_bytes: bytes, mime_type: str, filename: str = "file") -> str | None:
    """Upload media to WhatsApp Cloud API. Returns media_id or None on failure."""
    url = f"https://graph.facebook.com/v22.0/{WHATSAPP_PHONE_NUMBER_ID}/media"
    try:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"},
            data={"messaging_product": "whatsapp", "type": mime_type},
            files={"file": (filename, file_bytes, mime_type)},
        )
        resp.raise_for_status()
        media_id = resp.json().get("id")
        logger.info("Uploaded media to WhatsApp: %s", media_id)
        return media_id
    except httpx.HTTPStatusError as e:
        logger.error("WhatsApp media upload error %s: %s", e.response.status_code, e.response.text)
        return None
    except httpx.RequestError as e:
        logger.error("WhatsApp media upload failed: %s", e)
        return None
