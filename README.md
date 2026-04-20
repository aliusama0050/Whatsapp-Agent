# HSQ WhatsApp Business Agent

A production-ready WhatsApp Business API agent platform with AI-powered conversational responses, built for hospitality businesses. Features a FastAPI backend, React frontend, PostgreSQL database, and intelligent message handling using Ollama LLM.

## Overview

This application provides a complete WhatsApp Business management solution with:
- **AI-Powered Chat**: Smart responses using Ollama LLM (Llama 3.1)
- **Human Handoff**: Seamless transition between AI and human agents
- **Real-time Dashboard**: Live conversation monitoring via WebSockets
- **Multi-user Support**: Role-based access (Admin/Agent)
- **Rich Media**: Image, video, and document handling via Cloudinary
- **Template Messaging**: Pre-approved WhatsApp templates
- **Analytics & Export**: Conversation metrics and data export

## Architecture

### Backend (FastAPI + PostgreSQL)
| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Database | PostgreSQL + asyncpg |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| AI Engine | Ollama (Llama 3.1:8b) |
| WhatsApp API | Meta Cloud API v22.0 |
| Auth | JWT with refresh tokens |
| Media Storage | Cloudinary |
| Rate Limiting | SlowAPI |

### Frontend (React + TypeScript)
| Component | Technology |
|-----------|------------|
| Framework | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Build Tool | Vite 7 |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |

## Project Structure

```
.
├── app/
│   ├── agent.py              # AI response generation
│   ├── auth/                 # Authentication & RBAC
│   ├── config.py             # Environment configuration
│   ├── database.py           # PostgreSQL connection
│   ├── middleware/           # Request logging
│   ├── models/               # SQLAlchemy ORM models
│   ├── routers/              # API endpoints
│   ├── scripts/              # Admin seeding
│   ├── services/             # Business logic
│   └── whatsapp.py           # WhatsApp Cloud API client
├── alembic/                  # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # Auth & WebSocket contexts
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Route pages
│   │   └── services/         # API clients
│   ├── package.json
│   └── vite.config.ts
├── main.py                   # FastAPI application entry
├── Dockerfile                # Multi-stage build
├── docker-compose.yml        # Production orchestration
├── railway.json             # Railway deployment config
└── requirements.txt         # Python dependencies
```

## Features

### Core Messaging
- **Inbound Message Processing**: Webhook handling from Meta
- **Outbound Messaging**: Text, media, and template messages
- **24-Hour Window**: Automatic session management
- **Message Deduplication**: Prevents duplicate processing
- **HMAC Signature Verification**: Secure webhook validation

### AI Integration
- **Contextual Responses**: Conversation history awareness
- **Language Detection**: English, Roman Urdu, Urdu script
- **Session Management**: 2-hour idle timeout
- **Customizable Prompts**: System prompt configuration
- **Fallback Handling**: Graceful degradation on AI failure

### Dashboard & UI
- **Real-time Updates**: WebSocket-based live sync
- **Conversation List**: Search, filter, and sort
- **Message Thread**: Full conversation history
- **Agent Status**: AI/Human takeover toggle
- **Contact Management**: CRM functionality
- **Canned Responses**: Quick reply templates
- **Global Search**: Full-text conversation search
- **Dark Mode**: Tailwind zinc theme

### Admin Features
- **User Management**: Create/edit agents
- **Role-based Access**: Admin/Agent permissions
- **Audit Logging**: Action tracking
- **AI Configuration**: Prompt editing
- **Analytics Dashboard**: Usage metrics
- **Data Export**: JSON/CSV export

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL 15+
- Meta WhatsApp Business Account

### Local Development

1. **Clone & Setup**
```bash
git clone <repository-url>
cd HSQ-Agent-postgre
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment Variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Database Setup**
```bash
# Create PostgreSQL database
createdb hsq_whatsapp

# Run migrations
alembic upgrade head
```

4. **Start Backend**
```bash
python main.py
# Or: uvicorn main:app --reload
```

5. **Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
# Build and run
docker-compose up --build

# Access:
# - Frontend: http://localhost
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

### Railway Deployment

The project includes `railway.json` for seamless Railway.app deployment:

```bash
railway login
railway init
railway up
```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WHATSAPP_ACCESS_TOKEN` | Meta System User Token | `EAAxx...` |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Phone Number ID | `123456789` |
| `WEBHOOK_VERIFY_TOKEN` | Webhook verification token | `secure_random_string` |
| `WHATSAPP_APP_SECRET` | Meta App Secret | `a1b2c3...` |
| `JWT_SECRET_KEY` | Random secret for JWT | `random_32_char_string` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `ADMIN_PASSWORD` | Initial admin password | `secure_password` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `https://ollama.com` | Ollama instance URL |
| `OLLAMA_MODEL` | `llama3.1:8b` | Model name |
| `CLOUDINARY_CLOUD_NAME` | - | Media storage |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Frontend origin |

## API Documentation

### Authentication
```http
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Conversations
```http
GET  /api/conversations
GET  /api/conversations/{phone}
PUT  /api/conversations/{phone}/agent    # Toggle AI/Human
POST /api/conversations/{phone}/read     # Mark as read
PUT  /api/conversations/{phone}/tags     # Update tags
```

### Messages
```http
GET  /api/messages/{phone}
POST /api/messages/send                  # Send message
POST /api/messages/template              # Send template
```

### Admin
```http
GET  /api/admin/audit-logs
GET  /api/admin/stats
GET  /api/admin/system-health
POST /api/users                         # Create user
```

Full API docs available at `/docs` (Swagger UI) or `/redoc`.

## Webhook Setup (Meta)

1. Go to [Meta Developer Dashboard](https://developers.facebook.com)
2. Configure Webhook URL: `https://your-domain.com/webhook`
3. Set Verify Token (match `WEBHOOK_VERIFY_TOKEN`)
4. Subscribe to messages:
   - `messages`
   - `message_deliveries`
   - `message_reads`

## Security Features

- **JWT Authentication**: Short-lived access tokens + refresh tokens
- **HMAC Verification**: Webhook signature validation
- **Rate Limiting**: Login (5/min), API (60/min)
- **CORS Restricted**: Configurable allowed origins
- **SQL Injection Prevention**: Parameterized queries via SQLAlchemy
- **Non-root Container**: Docker security best practices
- **Audit Logging**: All admin actions tracked

## Customization

### AI Prompt Customization

Edit the system prompt in `app/agent.py` or via the Admin Panel:

```python
SYSTEM_PROMPT = """You are the WhatsApp concierge for [Your Business]...

## Key Facts
- Location: ...
- Services: ...
- Hours: ...

## Response Rules
- Keep responses short (2-3 sentences)
- Match user's language
- No emojis after first greeting
"""
```

### Adding Canned Responses

Via API or Admin Panel:
```http
POST /api/canned-responses
{
  "shortcut": "/pricing",
  "title": "Pricing Info",
  "body": "Our rates start at...",
  "category": "sales"
}
```

## Monitoring & Health

- **Health Check**: `GET /health` - Database connectivity
- **Docker Healthcheck**: Built-in container health monitoring
- **Structured Logging**: JSON format with correlation IDs
- **Memory Limits**: 512MB backend, 256MB frontend

## License

MIT License - See [LICENSE](LICENSE) file.

## Support

For issues and feature requests, please open a GitHub issue.
