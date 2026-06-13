from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.operator_documents import (
    ComplianceOverview,
    DocumentOut,
    DocumentUpload,
    ExpiryWatchlistItem,
)


def _gen_uuid() -> str:
    return str(uuid.uuid4())


def _days_until(expiry: Optional[date]) -> Optional[int]:
    if expiry is None:
        return None
    delta = (expiry - date.today()).days
    return delta


def _doc_status_from_days(days: Optional[int], existing_status: str) -> str:
    """Derive a display status factoring in expiry."""
    if days is None:
        return existing_status
    if days < 0:
        return "expired"
    return existing_status


async def list_documents(
    db: AsyncSession,
    operator_id: str,
    entity_type: Optional[str] = None,
) -> list[DocumentOut]:
    """Return all documents (aircraft + crew) for this operator, optionally filtered by entity_type."""
    results: list[DocumentOut] = []

    # ---- aircraft documents ----
    if entity_type in (None, "aircraft"):
        try:
            from app.models.operator_aircraft import AircraftDocument, OperatorAircraft

            stmt = (
                select(AircraftDocument, OperatorAircraft.registration_mark)
                .join(OperatorAircraft, AircraftDocument.aircraft_id == OperatorAircraft.id)
                .where(OperatorAircraft.operator_id == operator_id)
                .order_by(AircraftDocument.created_at.desc())
            )
            rows = (await db.execute(stmt)).all()
            for doc, reg_mark in rows:
                days = _days_until(doc.expiry_date)
                results.append(
                    DocumentOut(
                        id=doc.id,
                        entity_type="aircraft",
                        entity_id=doc.aircraft_id,
                        entity_name=reg_mark,
                        doc_type=doc.doc_type,
                        file_url=doc.file_url or "",
                        status=_doc_status_from_days(days, "uploaded"),
                        expiry_date=doc.expiry_date.isoformat() if doc.expiry_date else None,
                        days_until_expiry=days,
                        created_at=doc.created_at.isoformat(),
                    )
                )
        except Exception:
            pass

    # ---- crew documents ----
    if entity_type in (None, "pilot"):
        try:
            from app.models.operator_crew import CrewDocument, OperatorCrewMember

            stmt = (
                select(CrewDocument, OperatorCrewMember.name)
                .join(OperatorCrewMember, CrewDocument.crew_member_id == OperatorCrewMember.id)
                .where(OperatorCrewMember.operator_id == operator_id)
                .order_by(CrewDocument.created_at.desc())
            )
            rows = (await db.execute(stmt)).all()
            for doc, crew_name in rows:
                days = _days_until(doc.expiry_date)
                results.append(
                    DocumentOut(
                        id=doc.id,
                        entity_type="pilot",
                        entity_id=doc.crew_member_id,
                        entity_name=crew_name,
                        doc_type=doc.doc_type,
                        file_url=doc.file_url or "",
                        status=_doc_status_from_days(days, "uploaded"),
                        expiry_date=doc.expiry_date.isoformat() if doc.expiry_date else None,
                        days_until_expiry=days,
                        created_at=doc.created_at.isoformat(),
                    )
                )
        except Exception:
            pass

    return results


async def upload_document(
    db: AsyncSession,
    operator_id: str,
    payload: DocumentUpload,
) -> DocumentOut:
    """
    Upload / register a document.  We attach it to the correct entity table
    (aircraft or crew) based on payload.entity_type.
    """
    expiry_date_obj: Optional[date] = None
    if payload.expiry_date:
        try:
            expiry_date_obj = date.fromisoformat(payload.expiry_date)
        except ValueError:
            pass

    entity_name = payload.entity_id  # fallback

    if payload.entity_type == "aircraft":
        from app.models.operator_aircraft import AircraftDocument, OperatorAircraft

        # Verify aircraft belongs to operator
        aircraft_row = (
            await db.execute(
                select(OperatorAircraft).where(
                    OperatorAircraft.id == payload.entity_id,
                    OperatorAircraft.operator_id == operator_id,
                )
            )
        ).scalar_one_or_none()
        entity_name = aircraft_row.registration_mark if aircraft_row else payload.entity_id

        doc = AircraftDocument(
            id=_gen_uuid(),
            aircraft_id=payload.entity_id,
            doc_type=payload.doc_type,
            file_url=payload.file_url,
            expiry_date=expiry_date_obj,
            created_at=datetime.utcnow(),
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        days = _days_until(doc.expiry_date)
        return DocumentOut(
            id=doc.id,
            entity_type="aircraft",
            entity_id=doc.aircraft_id,
            entity_name=entity_name,
            doc_type=doc.doc_type,
            file_url=doc.file_url or "",
            status=_doc_status_from_days(days, "uploaded"),
            expiry_date=doc.expiry_date.isoformat() if doc.expiry_date else None,
            days_until_expiry=days,
            created_at=doc.created_at.isoformat(),
        )

    elif payload.entity_type in ("pilot", "crew"):
        from app.models.operator_crew import CrewDocument, OperatorCrewMember

        crew_row = (
            await db.execute(
                select(OperatorCrewMember).where(
                    OperatorCrewMember.id == payload.entity_id,
                    OperatorCrewMember.operator_id == operator_id,
                )
            )
        ).scalar_one_or_none()
        entity_name = crew_row.name if crew_row else payload.entity_id

        doc = CrewDocument(
            id=_gen_uuid(),
            crew_member_id=payload.entity_id,
            doc_type=payload.doc_type,
            file_url=payload.file_url,
            expiry_date=expiry_date_obj,
            created_at=datetime.utcnow(),
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        days = _days_until(doc.expiry_date)
        return DocumentOut(
            id=doc.id,
            entity_type="pilot",
            entity_id=doc.crew_member_id,
            entity_name=entity_name,
            doc_type=doc.doc_type,
            file_url=doc.file_url or "",
            status=_doc_status_from_days(days, "uploaded"),
            expiry_date=doc.expiry_date.isoformat() if doc.expiry_date else None,
            days_until_expiry=days,
            created_at=doc.created_at.isoformat(),
        )

    else:
        # company-level document: store as a generic aircraft doc fallback or return stub
        # No company_documents table yet — return a stub with provided data
        now = datetime.utcnow()
        days = _days_until(expiry_date_obj)
        return DocumentOut(
            id=_gen_uuid(),
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            entity_name=payload.entity_id,
            doc_type=payload.doc_type,
            file_url=payload.file_url,
            status="uploaded",
            expiry_date=expiry_date_obj.isoformat() if expiry_date_obj else None,
            days_until_expiry=days,
            created_at=now.isoformat(),
        )


async def get_expiry_watchlist(
    db: AsyncSession,
    operator_id: str,
    days_ahead: int = 60,
) -> list[ExpiryWatchlistItem]:
    """Return documents expiring within days_ahead days, sorted by days_left ascending."""
    items: list[ExpiryWatchlistItem] = []
    today = date.today()

    # aircraft documents
    try:
        from app.models.operator_aircraft import AircraftDocument, OperatorAircraft

        stmt = (
            select(AircraftDocument, OperatorAircraft.registration_mark)
            .join(OperatorAircraft, AircraftDocument.aircraft_id == OperatorAircraft.id)
            .where(
                OperatorAircraft.operator_id == operator_id,
                AircraftDocument.expiry_date.isnot(None),
            )
        )
        rows = (await db.execute(stmt)).all()
        for doc, reg_mark in rows:
            days = _days_until(doc.expiry_date)
            if days is not None and days <= days_ahead:
                items.append(
                    ExpiryWatchlistItem(
                        entity_type="aircraft",
                        entity_name=reg_mark,
                        doc_type=doc.doc_type,
                        expiry_date=doc.expiry_date.isoformat(),
                        days_left=days,
                        status="expired" if days < 0 else "expiring_soon",
                        document_id=doc.id,
                    )
                )
    except Exception:
        pass

    # crew documents
    try:
        from app.models.operator_crew import CrewDocument, OperatorCrewMember

        stmt = (
            select(CrewDocument, OperatorCrewMember.name)
            .join(OperatorCrewMember, CrewDocument.crew_member_id == OperatorCrewMember.id)
            .where(
                OperatorCrewMember.operator_id == operator_id,
                CrewDocument.expiry_date.isnot(None),
            )
        )
        rows = (await db.execute(stmt)).all()
        for doc, crew_name in rows:
            days = _days_until(doc.expiry_date)
            if days is not None and days <= days_ahead:
                items.append(
                    ExpiryWatchlistItem(
                        entity_type="pilot",
                        entity_name=crew_name,
                        doc_type=doc.doc_type,
                        expiry_date=doc.expiry_date.isoformat(),
                        days_left=days,
                        status="expired" if days < 0 else "expiring_soon",
                        document_id=doc.id,
                    )
                )
    except Exception:
        pass

    # crew medical expiry (stored on crew member, not in documents table)
    try:
        from app.models.operator_crew import OperatorCrewMember

        stmt = select(OperatorCrewMember).where(
            OperatorCrewMember.operator_id == operator_id,
            OperatorCrewMember.medical_expiry.isnot(None),
        )
        rows = (await db.execute(stmt)).scalars().all()
        for crew in rows:
            days = _days_until(crew.medical_expiry)
            if days is not None and days <= days_ahead:
                items.append(
                    ExpiryWatchlistItem(
                        entity_type="pilot",
                        entity_name=crew.name,
                        doc_type="Medical Certificate",
                        expiry_date=crew.medical_expiry.isoformat(),
                        days_left=days,
                        status="expired" if days < 0 else "expiring_soon",
                        document_id=crew.id,
                    )
                )
    except Exception:
        pass

    items.sort(key=lambda x: x.days_left)
    return items


async def get_compliance_overview(
    db: AsyncSession,
    operator_id: str,
) -> ComplianceOverview:
    """Aggregate compliance status from aircraft, crew and documents."""
    blockers: list[str] = []
    aircraft_issues: list[dict] = []
    crew_issues: list[dict] = []
    document_issues: list[dict] = []

    today = date.today()

    # ---- aircraft checks ----
    try:
        from app.models.operator_aircraft import AircraftDocument, OperatorAircraft

        aircraft_rows = (
            await db.execute(
                select(OperatorAircraft).where(OperatorAircraft.operator_id == operator_id)
            )
        ).scalars().all()

        for ac in aircraft_rows:
            if ac.status not in ("approved", "active"):
                aircraft_issues.append(
                    {
                        "entity_id": ac.id,
                        "entity_name": ac.registration_mark,
                        "issue": f"Aircraft status is '{ac.status}' — must be approved before flights",
                    }
                )
                blockers.append(f"Aircraft {ac.registration_mark} not approved")

        # expired aircraft docs
        doc_rows = (
            await db.execute(
                select(AircraftDocument, OperatorAircraft.registration_mark)
                .join(OperatorAircraft, AircraftDocument.aircraft_id == OperatorAircraft.id)
                .where(
                    OperatorAircraft.operator_id == operator_id,
                    AircraftDocument.expiry_date.isnot(None),
                )
            )
        ).all()
        for doc, reg_mark in doc_rows:
            if doc.expiry_date and doc.expiry_date < today:
                document_issues.append(
                    {
                        "document_id": doc.id,
                        "entity_type": "aircraft",
                        "entity_name": reg_mark,
                        "doc_type": doc.doc_type,
                        "issue": "Document expired",
                    }
                )
                blockers.append(f"Aircraft {reg_mark}: expired {doc.doc_type}")

    except Exception:
        pass

    # ---- crew checks ----
    try:
        from app.models.operator_crew import CrewDocument, OperatorCrewMember

        crew_rows = (
            await db.execute(
                select(OperatorCrewMember).where(OperatorCrewMember.operator_id == operator_id)
            )
        ).scalars().all()

        for crew in crew_rows:
            if crew.status not in ("approved", "active"):
                crew_issues.append(
                    {
                        "entity_id": crew.id,
                        "entity_name": crew.name,
                        "issue": f"Crew status is '{crew.status}' — must be approved",
                    }
                )
                blockers.append(f"Crew member {crew.name} not approved")

            if crew.medical_expiry and crew.medical_expiry < today:
                crew_issues.append(
                    {
                        "entity_id": crew.id,
                        "entity_name": crew.name,
                        "issue": "Medical certificate expired",
                    }
                )
                blockers.append(f"Crew member {crew.name}: medical certificate expired")

        # expired crew docs
        crew_doc_rows = (
            await db.execute(
                select(CrewDocument, OperatorCrewMember.name)
                .join(OperatorCrewMember, CrewDocument.crew_member_id == OperatorCrewMember.id)
                .where(
                    OperatorCrewMember.operator_id == operator_id,
                    CrewDocument.expiry_date.isnot(None),
                )
            )
        ).all()
        for doc, crew_name in crew_doc_rows:
            if doc.expiry_date and doc.expiry_date < today:
                document_issues.append(
                    {
                        "document_id": doc.id,
                        "entity_type": "pilot",
                        "entity_name": crew_name,
                        "doc_type": doc.doc_type,
                        "issue": "Document expired",
                    }
                )
                blockers.append(f"Crew {crew_name}: expired {doc.doc_type}")

    except Exception:
        pass

    can_publish = len(blockers) == 0
    operator_status = "compliant" if can_publish else "non_compliant"

    return ComplianceOverview(
        operator_status=operator_status,
        can_publish=can_publish,
        blockers=list(dict.fromkeys(blockers)),  # deduplicate, preserve order
        aircraft_issues=aircraft_issues,
        crew_issues=crew_issues,
        document_issues=document_issues,
    )
