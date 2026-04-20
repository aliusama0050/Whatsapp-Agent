import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.auth.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.models.auth import LoginRequest, TokenResponse, RefreshRequest
from app.models.db_models import User, RefreshToken
from app.config import ENVIRONMENT

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(User).where(User.username == body.username)
    result = await session.execute(stmt)
    user = result.scalars().first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    user_id = str(user.id)

    access_token = create_access_token(user_id, user.username, user.role)
    refresh_token, jti, expires_at = create_refresh_token(user_id)

    # Store refresh token
    session.add(RefreshToken(
        user_id=user_id,
        jti=jti,
        expires_at=expires_at,
        remember_me=body.remember_me,
    ))

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await session.commit()

    # Set refresh token as httpOnly cookie
    cookie_max_age = 7 * 24 * 60 * 60 if body.remember_me else None
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=ENVIRONMENT != "development",
        samesite="strict",
        max_age=cookie_max_age,
        path="/api/auth",
    )

    logger.info("User '%s' logged in (remember_me=%s)", user.username, body.remember_me)
    return TokenResponse(access_token=access_token, remember_me=body.remember_me)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest = None,
    session: AsyncSession = Depends(get_session),
):
    token = request.cookies.get("refresh_token")
    if not token and body:
        token = body.refresh_token
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    try:
        payload = decode_refresh_token(token)
    except Exception:
        logger.debug("Refresh token decode failed", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    jti = payload["jti"]

    # Check if token exists and is not revoked
    stmt = select(RefreshToken).where(
        RefreshToken.jti == jti, RefreshToken.user_id == user_id
    )
    result = await session.execute(stmt)
    stored = result.scalars().first()

    if not stored or stored.revoked:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    remember_me = stored.remember_me

    # Revoke old token (rotation)
    stored.revoked = True

    # Get user
    user = await session.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Issue new tokens
    access_token = create_access_token(user_id, user.username, user.role)
    new_refresh, new_jti, new_expires = create_refresh_token(user_id)

    session.add(RefreshToken(
        user_id=user_id,
        jti=new_jti,
        expires_at=new_expires,
        remember_me=remember_me,
    ))
    await session.commit()

    cookie_max_age = 7 * 24 * 60 * 60 if remember_me else None
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=ENVIRONMENT != "development",
        samesite="strict",
        max_age=cookie_max_age,
        path="/api/auth",
    )

    return TokenResponse(access_token=access_token)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    token = request.cookies.get("refresh_token")
    if token:
        try:
            payload = decode_refresh_token(token)
            stmt = (
                update(RefreshToken)
                .where(RefreshToken.jti == payload["jti"])
                .values(revoked=True)
            )
            await session.execute(stmt)
            await session.commit()
        except Exception:
            pass

    response.delete_cookie("refresh_token", path="/api/auth")
    return {"message": "Logged out"}
