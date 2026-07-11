"""Authentication service — JWT, password hashing, token management."""

import hashlib
import logging
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from apps.api.config import get_settings
from core.auth.models import RefreshToken, User

logger = logging.getLogger(__name__)

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


def get_jwt_secret() -> str:
    """Get JWT secret from settings."""
    settings = get_settings()
    return getattr(settings, "jwt_secret", "dev-secret-change-in-production")


# --- Password utilities ---


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# --- Token utilities ---


def create_access_token(user_id: str, email: str, role: str) -> tuple[str, int]:
    """
    Create a JWT access token.

    Returns (token_string, expires_in_seconds).
    """
    expires_in = ACCESS_TOKEN_EXPIRE_MINUTES * 60
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }

    token = jwt.encode(payload, get_jwt_secret(), algorithm=ALGORITHM)
    return token, expires_in


def decode_access_token(token: str) -> dict | None:
    """
    Decode and validate a JWT access token.

    Returns payload dict or None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        logger.debug("Access token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.debug(f"Invalid access token: {e}")
        return None


def generate_refresh_token() -> str:
    """Generate an opaque refresh token (UUID)."""
    return str(uuid.uuid4())


def hash_token(token: str) -> str:
    """Hash a refresh token for storage (SHA-256)."""
    return hashlib.sha256(token.encode()).hexdigest()


# --- Database operations ---


async def create_user(
    db: AsyncSession,
    email: str,
    password: str,
    name: str,
    role: str = "USER",
    credits: int = 100,
) -> User:
    """Create a new user account."""
    user = User(
        id=str(ULID()),
        email=email.lower().strip(),
        password_hash=hash_password(password),
        name=name.strip(),
        role=role,
        credits=credits,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Fetch user by email address."""
    result = await db.execute(
        select(User).where(User.email == email.lower().strip())
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    """Fetch user by ID."""
    return await db.get(User, user_id)


async def store_refresh_token(
    db: AsyncSession, user_id: str, token: str
) -> RefreshToken:
    """Store a hashed refresh token in the database."""
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    record = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=hash_token(token),
        expires_at=expires_at,
    )
    db.add(record)
    await db.flush()
    return record


async def validate_refresh_token(
    db: AsyncSession, token: str
) -> RefreshToken | None:
    """Validate a refresh token and return the record if valid."""
    token_h = hash_token(token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_h,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    return result.scalar_one_or_none()


async def revoke_refresh_token(db: AsyncSession, token: str) -> bool:
    """Revoke a refresh token."""
    token_h = hash_token(token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_h,
            RefreshToken.revoked_at.is_(None),
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.revoked_at = datetime.now(timezone.utc)
        await db.flush()
        return True
    return False


async def revoke_all_user_tokens(db: AsyncSession, user_id: str) -> int:
    """Revoke all refresh tokens for a user."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
    )
    tokens = result.scalars().all()
    now = datetime.now(timezone.utc)
    for token in tokens:
        token.revoked_at = now
    await db.flush()
    return len(tokens)
