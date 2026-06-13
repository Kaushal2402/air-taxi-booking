from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: str
    entity_type: str  # company | aircraft | pilot
    entity_id: str
    entity_name: str
    doc_type: str
    file_url: str
    status: str  # uploaded | in_review | approved | rejected | expired
    expiry_date: Optional[str] = None
    days_until_expiry: Optional[int] = None
    created_at: str

    model_config = {"from_attributes": True}


class DocumentUpload(BaseModel):
    entity_type: str
    entity_id: str
    doc_type: str
    file_url: str
    expiry_date: Optional[str] = None


class ComplianceOverview(BaseModel):
    operator_status: str
    can_publish: bool
    blockers: list[str]
    aircraft_issues: list[dict]
    crew_issues: list[dict]
    document_issues: list[dict]


class ExpiryWatchlistItem(BaseModel):
    entity_type: str
    entity_name: str
    doc_type: str
    expiry_date: str
    days_left: int
    status: str
    document_id: str
