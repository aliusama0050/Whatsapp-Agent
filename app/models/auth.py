from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    remember_me: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str
