from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: Literal["admin", "agent"] = "agent"


class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    role: Optional[Literal["admin", "agent"]] = None
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str
