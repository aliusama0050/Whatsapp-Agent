import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete as sa_delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.rbac import require_admin
from app.auth.security import verify_password, hash_password
from app.database import get_session
from app.models.db_models import User
from app.models.user import (
    UserResponse,
    PasswordChangeRequest,
    UserCreateRequest,
    UserUpdateRequest,
    ResetPasswordRequest,
)
from app.services.audit_service import log_action

router = APIRouter()


def _serialize_user(u: User) -> dict:
    return {
        "id": str(u.id),
        "username": u.username,
        "role": u.role or "agent",
        "is_active": u.is_active,
        "last_login": u.last_login,
        "created_at": u.created_at,
    }


# ─── Self endpoints ───

@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    return UserResponse(
        id=str(user.id),
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        last_login=user.last_login,
    )


@router.put("/me/password")
async def change_password(
    body: PasswordChangeRequest,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password_hash = hash_password(body.new_password)
    await session.commit()
    return {"message": "Password changed successfully"}


# ─── Admin user management ───

@router.get("/")
async def list_users(
    _user=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(User).order_by(User.username)
    result = await session.execute(stmt)
    users = [_serialize_user(u) for u in result.scalars().all()]
    return {"users": users}


@router.post("/")
async def create_user(
    body: UserCreateRequest,
    _user=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    # Check for existing
    stmt = select(User).where(User.username == body.username)
    result = await session.execute(stmt)
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="Username already exists")

    new_user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    session.add(new_user)
    await session.flush()
    await log_action(session, _user.id, _user.username, "user_created", "user", str(new_user.id), {"username": body.username, "role": body.role})
    await session.commit()
    return _serialize_user(new_user)


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdateRequest,
    admin=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if user_id == str(admin.id) and updates.get("is_active") is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    target = await session.get(User, uuid.UUID(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    for key, value in updates.items():
        setattr(target, key, value)
    await log_action(session, admin.id, admin.username, "user_updated", "user", user_id, updates)
    await session.commit()
    return _serialize_user(target)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    admin=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    if user_id == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    stmt = sa_delete(User).where(User.id == uuid.UUID(user_id))
    result = await session.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_action(session, admin.id, admin.username, "user_deleted", "user", user_id)
    await session.commit()
    return {"ok": True}


@router.put("/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    body: ResetPasswordRequest,
    _user=Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    target = await session.get(User, uuid.UUID(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.password_hash = hash_password(body.new_password)
    await log_action(session, _user.id, _user.username, "password_reset", "user", user_id)
    await session.commit()
    return {"message": "Password reset successfully"}
