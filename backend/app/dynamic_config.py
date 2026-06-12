"""
Dynamic configuration store — provider keys saved in DB, loaded into an
in-process dict at startup.  No server restart needed when values change.

Usage:
    from app.dynamic_config import dyn

    value = dyn.get("FCM_SERVICE_ACCOUNT_JSON")   # DB value → env fallback → ""
    dyn.set("FCM_SERVICE_ACCOUNT_JSON", raw_json)  # updates dict + DB row
"""
from __future__ import annotations

from typing import Optional

from app.config import get_settings

_settings = get_settings()

# ── In-process store ──────────────────────────────────────────────────────────

class _DynamicConfig:
    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    def get(self, key: str) -> str:
        """Return DB-stored value first, then fall back to env/settings."""
        db_val = self._store.get(key)
        if db_val:
            return db_val
        # Env fallback
        return getattr(_settings, key, "") or ""

    def set(self, key: str, value: str) -> None:
        self._store[key] = value

    def load(self, rows: dict[str, str]) -> None:
        """Bulk-load from DB rows at startup."""
        self._store.update(rows)


dyn = _DynamicConfig()


# ── Startup loader ────────────────────────────────────────────────────────────

async def load_from_db() -> None:
    """Call once at app startup to hydrate the in-process store from DB."""
    try:
        from sqlalchemy import text
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SELECT `key`, value FROM integration_configs"))
            rows = {row[0]: row[1] for row in result if row[1]}
            dyn.load(rows)
    except Exception:
        pass  # non-fatal — falls back to env vars


# ── DB writer ─────────────────────────────────────────────────────────────────

async def save_to_db(key: str, value: str) -> None:
    """Upsert a single key into the DB and update the in-process store."""
    from sqlalchemy import text
    from app.database import AsyncSessionLocal

    dyn.set(key, value)

    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "INSERT INTO integration_configs (`key`, value) VALUES (:k, :v) "
                "ON DUPLICATE KEY UPDATE value = :v"
            ),
            {"k": key, "v": value},
        )
        await db.commit()
