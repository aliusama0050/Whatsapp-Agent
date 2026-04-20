from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel


class ConversationResponse(BaseModel):
    id: str
    phone_number: str
    customer_name: str
    agent_status: str
    last_message_at: Optional[datetime] = None
    last_customer_message_at: Optional[datetime] = None
    window_expires_at: Optional[datetime] = None
    unread_count: int = 0
    last_message_preview: Optional[str] = None


class AgentToggleRequest(BaseModel):
    status: Literal["ai_active", "human_takeover"]
