"""
Run once to create the first super admin account.

Usage:
    cd backend
    python scripts/seed_super_admin.py

The script reads DB config from .env via app.config.
"""
from __future__ import annotations

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import get_settings
from app.core.security import hash_password
from app.models.admin_user import AdminUser
from app.models import *  # noqa: ensure all models are registered

settings = get_settings()

DEFAULT_EMAIL = "admin@acmemobility.com"
DEFAULT_PASSWORD = "Admin@123456"
DEFAULT_NAME = "Super Admin"


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        result = await session.execute(
            select(AdminUser).where(AdminUser.email == DEFAULT_EMAIL, AdminUser.deleted_at.is_(None))
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"Super admin already exists: {DEFAULT_EMAIL}")
            return

        user = AdminUser(
            name=DEFAULT_NAME,
            email=DEFAULT_EMAIL,
            password_hash=hash_password(DEFAULT_PASSWORD),
            role="super_admin",
            status="active",
        )
        session.add(user)
        await session.commit()
        print(f"Created super admin:")
        print(f"  Email   : {DEFAULT_EMAIL}")
        print(f"  Password: {DEFAULT_PASSWORD}")
        print(f"  Role    : super_admin")
        print("Change the password immediately after first login.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
