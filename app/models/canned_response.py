from pydantic import BaseModel
from typing import Optional


class CannedResponseCreate(BaseModel):
    shortcut: str
    title: str
    body: str
    category: str = "General"


class CannedResponseUpdate(BaseModel):
    shortcut: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
