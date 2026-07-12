"""Pydantic schemas for Authentication API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

# --- Request schemas ---


class RegisterRequest(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=200)


class LoginRequest(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class RefreshRequest(BaseModel):
    """Schema for token refresh."""

    refresh_token: str = Field(..., min_length=1)


class ChangePasswordRequest(BaseModel):
    """Schema for changing password."""

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


# --- Response schemas ---


class UserResponse(BaseModel):
    """Public user info response."""

    id: str
    email: str
    name: str
    avatar_url: Optional[str]
    role: str
    status: str
    credits: int
    email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthTokenResponse(BaseModel):
    """Response containing auth tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenResponse(BaseModel):
    """Response for token refresh."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MessageResponse(BaseModel):
    """Simple message response."""

    message: str
