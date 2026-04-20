import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

# ─── Environment ───
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
WEBHOOK_VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "")
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET", "")

# Ollama Cloud
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "https://ollama.com")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")

# Server
PORT = int(os.getenv("PORT", "8000"))

# PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/hsq_whatsapp")

# JWT
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Admin (auto-seed)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

# CORS
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")

# Cloudinary
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

# Rate Limiting
RATE_LIMIT_LOGIN = os.getenv("RATE_LIMIT_LOGIN", "5/minute")
RATE_LIMIT_API = os.getenv("RATE_LIMIT_API", "60/minute")


# ─── Startup Validation ───

_REQUIRED_VARS = {
    "JWT_SECRET_KEY": JWT_SECRET_KEY,
    "WHATSAPP_ACCESS_TOKEN": WHATSAPP_ACCESS_TOKEN,
    "WHATSAPP_PHONE_NUMBER_ID": WHATSAPP_PHONE_NUMBER_ID,
    "WEBHOOK_VERIFY_TOKEN": WEBHOOK_VERIFY_TOKEN,
    "DATABASE_URL": DATABASE_URL,
    "ADMIN_PASSWORD": ADMIN_PASSWORD,
}


def validate_config() -> None:
    missing = [name for name, value in _REQUIRED_VARS.items() if not value]
    if missing:
        logger = logging.getLogger(__name__)
        logger.critical("Missing required environment variables: %s", ", ".join(missing))
        sys.exit(1)
