"""
Seed the initial SUPER_ADMIN user.

Usage:
    python scripts/seed_admin.py

Environment:
    ADMIN_EMAIL    — Admin email (default: admin@aivideo.local)
    ADMIN_PASSWORD — Admin password (default: Admin123!)
    ADMIN_NAME     — Admin display name (default: Super Admin)
"""

import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import async_session_factory  # noqa: E402
from apps.api.services.auth_service import create_user, get_user_by_email  # noqa: E402


async def seed_admin():
    """Create the initial SUPER_ADMIN user if not exists."""
    email = os.environ.get("ADMIN_EMAIL", "admin@aivideo.dev")
    password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    name = os.environ.get("ADMIN_NAME", "Super Admin")

    async with async_session_factory() as session:
        try:
            existing = await get_user_by_email(session, email)
            if existing:
                print(f"[INFO] Admin user already exists: {email} (role={existing.role})")
                return

            user = await create_user(
                db=session,
                email=email,
                password=password,
                name=name,
                role="SUPER_ADMIN",
                credits=999999,
            )
            await session.commit()

            print(f"[OK] SUPER_ADMIN created successfully:")
            print(f"     ID:    {user.id}")
            print(f"     Email: {user.email}")
            print(f"     Name:  {user.name}")
            print(f"     Role:  {user.role}")
            print(f"")
            print(f"     Login with: {email} / {password}")
            print(f"     (Change this password in production!)")

        except Exception as e:
            await session.rollback()
            print(f"[ERROR] Failed to create admin: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_admin())
