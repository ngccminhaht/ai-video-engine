"""Authentication endpoints — register, login, refresh, logout, me."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies.auth import get_current_user
from apps.api.schemas.auth_schemas import (
    AuthTokenResponse,
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RefreshTokenResponse,
    RegisterRequest,
    UserResponse,
)
from apps.api.services.auth_service import (
    create_access_token,
    create_user,
    generate_refresh_token,
    get_user_by_email,
    hash_password,
    revoke_all_user_tokens,
    revoke_refresh_token,
    store_refresh_token,
    validate_refresh_token,
    verify_password,
)
from core.auth.models import User
from core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new user account.

    Returns the created user (without tokens — user must login separately).
    """
    # Check if email already exists
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    user = await create_user(
        db=db,
        email=data.email,
        password=data.password,
        name=data.name,
    )

    logger.info(f"New user registered: {user.email} (id={user.id})")
    return user


@router.post("/login", response_model=AuthTokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user and return access + refresh tokens.
    """
    user = await get_user_by_email(db, data.email)

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if user.status == "suspended":
        raise HTTPException(
            status_code=403,
            detail="Account suspended. Contact support.",
        )

    if user.status == "deleted":
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    # Generate tokens
    access_token, expires_in = create_access_token(
        user_id=user.id, email=user.email, role=user.role
    )
    refresh_token = generate_refresh_token()

    # Store refresh token
    await store_refresh_token(db, user.id, refresh_token)

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()

    logger.info(f"User logged in: {user.email}")

    return AuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Refresh the access token using a valid refresh token.

    The refresh token itself is not rotated (kept simple).
    """
    token_record = await validate_refresh_token(db, data.refresh_token)

    if token_record is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token",
        )

    # Get the user
    user = await db.get(User, token_record.user_id)
    if user is None or user.status in ("suspended", "deleted"):
        raise HTTPException(
            status_code=401,
            detail="User account not available",
        )

    # Generate new access token
    access_token, expires_in = create_access_token(
        user_id=user.id, email=user.email, role=user.role
    )

    return RefreshTokenResponse(
        access_token=access_token,
        expires_in=expires_in,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Logout by revoking the refresh token.

    The access token will expire naturally (short-lived).
    """
    revoked = await revoke_refresh_token(db, data.refresh_token)

    if not revoked:
        # Don't error — idempotent operation
        logger.debug("Logout called with invalid/already-revoked token")

    return MessageResponse(message="Logged out successfully")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Request a password reset email.

    Always returns success (202-like behavior) to prevent email enumeration.
    In production, this would send an actual email with a reset link.
    """
    email = data.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Check if user exists (but don't reveal this to the caller)
    user = await get_user_by_email(db, email)
    if user:
        # TODO: In production, generate a reset token and send email
        # For now, log that a reset was requested
        logger.info(f"Password reset requested for: {email}")

    # Always return success to prevent email enumeration
    return MessageResponse(message="If an account exists with that email, a reset link has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Reset password with a token.

    Stub implementation — in production this would validate the reset token
    and set the new password.
    """
    token = data.get("token", "")
    new_password = data.get("new_password", "")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new_password are required")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # TODO: Validate reset token, find user, update password
    # For now, return error since reset tokens are not yet implemented
    raise HTTPException(
        status_code=501,
        detail="Password reset is not yet fully implemented. Please contact support.",
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return user


@router.post("/me/password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change the current user's password.

    Requires the current password for verification.
    Revokes all existing refresh tokens (forces re-login on other devices).
    """
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    user.password_hash = hash_password(data.new_password)
    await db.flush()

    # Revoke all refresh tokens for security
    revoked_count = await revoke_all_user_tokens(db, user.id)
    logger.info(
        f"Password changed for user {user.email}, revoked {revoked_count} tokens"
    )

    return MessageResponse(message="Password changed successfully")
