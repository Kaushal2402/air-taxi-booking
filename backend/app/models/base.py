import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, String, func, types
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(types.TypeDecorator):
    """A DateTime column type that always returns timezone-aware UTC datetimes.

    MySQL stores DATETIME values without timezone information.  When SQLAlchemy
    reads them back it produces naive ``datetime`` objects, which causes
    downstream code (Pydantic, JavaScript) to misinterpret the values.

    This decorator transparently:
    • On READ  – attaches ``tzinfo=UTC`` to every naive datetime.
    • On WRITE – converts any tz-aware value to UTC-naive before storing
                 (MySQL DATETIME cannot hold tz info anyway).
    """
    impl = types.DateTime
    cache_ok = True

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    def process_bind_param(self, value, dialect):
        if isinstance(value, datetime) and value.tzinfo is not None:
            # Store as UTC-naive; MySQL DATETIME has no timezone slot.
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class SoftDeleteMixin:
    deleted_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)


class UUIDPrimaryKeyMixin:
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
