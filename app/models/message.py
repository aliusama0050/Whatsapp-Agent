from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MessageResponse(BaseModel):
    id: str
    phone_number: str
    direction: str
    sender_type: str
    message_type: str
    body: str
    status: str
    timestamp: datetime


class SendMessageRequest(BaseModel):
    body: str
