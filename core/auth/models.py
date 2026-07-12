"""ORM models for users and refresh tokens."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class User(Base):
    """Platform user account."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)  # ULID
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Role: USER, ADMIN, SUPER_ADMIN
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="USER", index=True)

    # Status: active, suspended, deleted
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", index=True)

    # Credits
    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Email verification
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Tracking
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class RefreshToken(Base):
    """Stored refresh tokens for session management."""

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    user_id: Mapped[str] = mapped_column(String(26), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
