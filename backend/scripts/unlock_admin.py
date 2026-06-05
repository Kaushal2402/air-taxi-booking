import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import get_settings
from app.models.admin_user import AdminUser

settings = get_settings()

DEFAULT_EMAIL = "admin@acmemobility.com"

async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        result = await session.execute(
            select(AdminUser).where(AdminUser.email == DEFAULT_EMAIL, AdminUser.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if user:
            user.failed_attempts = 0
            user.locked_until = None
            user.status = "active"
            await session.commit()
            print("Successfully unlocked admin user and reset failed attempts.")
        else:
            print("Admin user not found.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
