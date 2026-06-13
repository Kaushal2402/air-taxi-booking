from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.operator_settings import OperatorSettings, OperatorSettingsUpdate

MIN_CUTOFF_MINUTES = 30


async def get_settings(db: AsyncSession, operator_id: str) -> OperatorSettings:
    """Return operator settings, falling back to defaults if no row exists."""
    result = await db.execute(
        text(
            "SELECT operator_id, default_manifest_cutoff_min, default_checklist_template, "
            "locale, timezone, public_contact_email, public_contact_phone, public_contact_name "
            "FROM operator_settings WHERE operator_id = :operator_id"
        ),
        {"operator_id": operator_id},
    )
    row = result.mappings().first()

    if row is None:
        return OperatorSettings(operator_id=operator_id)

    import json

    checklist = row["default_checklist_template"]
    if isinstance(checklist, str):
        try:
            checklist = json.loads(checklist)
        except (ValueError, TypeError):
            checklist = None

    return OperatorSettings(
        operator_id=row["operator_id"],
        default_manifest_cutoff_min=row["default_manifest_cutoff_min"],
        default_checklist_template=checklist,
        locale=row["locale"],
        timezone=row["timezone"],
        public_contact_email=row["public_contact_email"],
        public_contact_phone=row["public_contact_phone"],
        public_contact_name=row["public_contact_name"],
    )


async def update_settings(
    db: AsyncSession, operator_id: str, payload: OperatorSettingsUpdate
) -> OperatorSettings:
    """Upsert operator settings with validation against admin bounds."""
    if (
        payload.default_manifest_cutoff_min is not None
        and payload.default_manifest_cutoff_min < MIN_CUTOFF_MINUTES
    ):
        raise HTTPException(
            status_code=422,
            detail=f"default_manifest_cutoff_min must be >= {MIN_CUTOFF_MINUTES} minutes.",
        )

    import json

    checklist_json: str | None = None
    if payload.default_checklist_template is not None:
        checklist_json = json.dumps(payload.default_checklist_template)

    # Fetch current to merge defaults
    current = await get_settings(db, operator_id)

    new_cutoff = (
        payload.default_manifest_cutoff_min
        if payload.default_manifest_cutoff_min is not None
        else current.default_manifest_cutoff_min
    )
    new_checklist = (
        payload.default_checklist_template
        if payload.default_checklist_template is not None
        else current.default_checklist_template
    )
    new_locale = payload.locale if payload.locale is not None else current.locale
    new_timezone = payload.timezone if payload.timezone is not None else current.timezone
    new_email = (
        payload.public_contact_email
        if payload.public_contact_email is not None
        else current.public_contact_email
    )
    new_phone = (
        payload.public_contact_phone
        if payload.public_contact_phone is not None
        else current.public_contact_phone
    )
    new_name = (
        payload.public_contact_name
        if payload.public_contact_name is not None
        else current.public_contact_name
    )

    checklist_store = json.dumps(new_checklist) if new_checklist is not None else None

    await db.execute(
        text(
            """
            INSERT INTO operator_settings (
                operator_id,
                default_manifest_cutoff_min,
                default_checklist_template,
                locale,
                timezone,
                public_contact_email,
                public_contact_phone,
                public_contact_name
            ) VALUES (
                :operator_id,
                :default_manifest_cutoff_min,
                :default_checklist_template,
                :locale,
                :timezone,
                :public_contact_email,
                :public_contact_phone,
                :public_contact_name
            )
            ON DUPLICATE KEY UPDATE
                default_manifest_cutoff_min  = VALUES(default_manifest_cutoff_min),
                default_checklist_template   = VALUES(default_checklist_template),
                locale                       = VALUES(locale),
                timezone                     = VALUES(timezone),
                public_contact_email         = VALUES(public_contact_email),
                public_contact_phone         = VALUES(public_contact_phone),
                public_contact_name          = VALUES(public_contact_name)
            """
        ),
        {
            "operator_id": operator_id,
            "default_manifest_cutoff_min": new_cutoff,
            "default_checklist_template": checklist_store,
            "locale": new_locale,
            "timezone": new_timezone,
            "public_contact_email": new_email,
            "public_contact_phone": new_phone,
            "public_contact_name": new_name,
        },
    )
    await db.commit()

    return OperatorSettings(
        operator_id=operator_id,
        default_manifest_cutoff_min=new_cutoff,
        default_checklist_template=new_checklist,
        locale=new_locale,
        timezone=new_timezone,
        public_contact_email=new_email,
        public_contact_phone=new_phone,
        public_contact_name=new_name,
    )
