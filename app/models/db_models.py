"""
SQLAlchemy ORM models for HSQ WhatsApp Agent.

All tables use UUID primary keys and proper foreign key relationships.
Pydantic request/response schemas remain in their own files (user.py, etc.).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ────────────────────────────────────────────
# Users
# ────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="agent")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )


# ────────────────────────────────────────────
# Conversations
# ────────────────────────────────────────────

class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    phone_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(200), default="Unknown")
    agent_status: Mapped[str] = mapped_column(String(30), default="ai_active")
    agent_status_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    agent_status_changed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True
    )
    last_customer_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    window_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    unread_count: Mapped[int] = mapped_column(default=0)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(100)), default=list
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    # Relationships
    notes: Mapped[list["ConversationNote"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan",
        order_by="ConversationNote.created_at.desc()",
    )
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan",
    )


# ────────────────────────────────────────────
# Conversation Notes (extracted from embedded)
# ────────────────────────────────────────────

class ConversationNote(Base):
    __tablename__ = "conversation_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True,
    )
    text: Mapped[str] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(100))
    created_by_name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="notes")


# ────────────────────────────────────────────
# Messages
# ────────────────────────────────────────────

class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conv_timestamp", "conversation_id", "timestamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
    )
    phone_number: Mapped[str] = mapped_column(String(30), index=True)
    direction: Mapped[str] = mapped_column(String(10))  # inbound | outbound
    sender_type: Mapped[str] = mapped_column(String(20))  # customer | ai_agent | human_agent
    sender_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    message_type: Mapped[str] = mapped_column(String(20), default="text")
    content: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="sent")
    whatsapp_message_id: Mapped[str | None] = mapped_column(
        String(200), unique=True, nullable=True
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


# ────────────────────────────────────────────
# Contacts
# ────────────────────────────────────────────

class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    phone_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    company: Mapped[str] = mapped_column(String(200), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


# ────────────────────────────────────────────
# Canned Responses
# ────────────────────────────────────────────

class CannedResponse(Base):
    __tablename__ = "canned_responses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    shortcut: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), default="General", index=True)
    created_by: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


# ────────────────────────────────────────────
# AI Config (singleton)
# ────────────────────────────────────────────

class AIConfig(Base):
    __tablename__ = "ai_config"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default="ai_config_singleton")
    system_prompt: Mapped[str] = mapped_column(Text, default="")
    fallback_message: Mapped[str] = mapped_column(Text, default="")
    knowledge_entries: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


# ────────────────────────────────────────────
# Refresh Tokens
# ────────────────────────────────────────────

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[str] = mapped_column(String(100), index=True)
    jti: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    remember_me: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )


# ────────────────────────────────────────────
# Processed Message IDs (dedup)
# ────────────────────────────────────────────

class ProcessedMessageId(Base):
    __tablename__ = "processed_message_ids"

    id: Mapped[str] = mapped_column(String(200), primary_key=True)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )


# ────────────────────────────────────────────
# Audit Logs (admin panel)
# ────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    username: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(100), index=True)
    target_type: Mapped[str | None] = mapped_column(String(50))
    target_id: Mapped[str | None] = mapped_column(String(200))
    details: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )


# ────────────────────────────────────────────
# Registration helper (imported by database.py)
# ────────────────────────────────────────────

def _register_models():
    """No-op. Importing this module registers all models with Base.metadata."""
    pass
