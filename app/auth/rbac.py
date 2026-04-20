from fastapi import Depends, HTTPException, status
from app.auth.dependencies import get_current_user


async def require_admin(user=Depends(get_current_user)):
    """Dependency that ensures the current user has admin role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
