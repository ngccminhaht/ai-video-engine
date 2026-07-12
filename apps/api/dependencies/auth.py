"""Authentication dependencies for FastAPI route handlers."""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.services.auth_service import decode_access_token, get_user_by_id
from core.auth.models import User
from core.database import get_db

logger = logging.getLogger(__name__)

# Bearer token scheme (returns None if no token present when auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract and validate the current user from the JWT access token.

    Checks:
    1. Authorization header present with Bearer token
    2. Token is valid and not expired
    3. User exists and is not suspended

    Raises HTTPException 401 if any check fails.
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await get_user_by_id(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status == "suspended":
        raise HTTPException(
            status_code=403,
            detail="Account suspended",
        )

    if user.status == "deleted":
        raise HTTPException(
            status_code=401,
            detail="Account deleted",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Optionally extract current user. Returns None if no valid token present.

    Used for endpoints that work both authenticated and unauthenticated
    (e.g., during transition period with REQUIRE_AUTH=false).
    """
    if credentials is None:
        return None

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = await get_user_by_id(db, user_id)
    if user is None or user.status in ("suspended", "deleted"):
        return None

    return user


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    """
    Require ADMIN or SUPER_ADMIN role.

    Use as a dependency on admin-only endpoints.
    """
    if user.role not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )
    return user


async def require_super_admin(
    user: User = Depends(get_current_user),
) -> User:
    """
    Require SUPER_ADMIN role.

    Use for dangerous operations like role changes and system config.
    """
    if user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Super admin access required",
        )
    return user
