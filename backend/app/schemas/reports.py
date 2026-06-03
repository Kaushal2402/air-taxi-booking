from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel

from app.models.report import ReportFormat, ReportFrequency, ReportStatus


# ── Report Template ────────────────────────────────────────────────────────────

class ReportTemplateCreate(BaseModel):
    name: str
    description: str | None = None
    report_type: str = "custom"
    tag: str | None = None
    icon: str | None = None
    default_frequency: ReportFrequency = ReportFrequency.once
    default_format: ReportFormat = ReportFormat.pdf
    config: Dict[str, Any] | None = None


class ReportTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    tag: str | None = None
    default_frequency: ReportFrequency | None = None
    default_format: ReportFormat | None = None
    config: Dict[str, Any] | None = None
    is_active: bool | None = None


class ReportTemplateResponse(BaseModel):
    id: str
    name: str
    description: str | None
    report_type: str
    tag: str | None
    icon: str | None
    default_frequency: ReportFrequency
    default_format: ReportFormat
    config: Dict[str, Any] | None
    is_standard: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportTemplateListResponse(BaseModel):
    items: List[ReportTemplateResponse]
    total: int


# ── Report Schedule ────────────────────────────────────────────────────────────

class ReportScheduleCreate(BaseModel):
    name: str
    frequency: ReportFrequency
    format: ReportFormat
    recipients: str
    config: Dict[str, Any] | None = None
    next_run_at: datetime | None = None


class ReportScheduleUpdate(BaseModel):
    name: str | None = None
    frequency: ReportFrequency | None = None
    format: ReportFormat | None = None
    recipients: str | None = None
    is_active: bool | None = None
    next_run_at: datetime | None = None


class ReportScheduleResponse(BaseModel):
    id: str
    template_id: str
    name: str
    frequency: ReportFrequency
    format: ReportFormat
    recipients: str
    is_active: bool
    next_run_at: datetime | None
    last_run_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Report Export ──────────────────────────────────────────────────────────────

class ReportExportRequest(BaseModel):
    name: str
    format: ReportFormat = ReportFormat.pdf
    config: Dict[str, Any] | None = None


class ReportExportResponse(BaseModel):
    id: str
    template_id: str | None
    name: str
    format: ReportFormat
    status: ReportStatus
    file_url: str | None
    file_size_kb: str | None
    error_message: str | None
    started_at: datetime
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportExportListResponse(BaseModel):
    items: List[ReportExportResponse]
    total: int
    page: int
    page_size: int


# ── Builder preview (no DB) ────────────────────────────────────────────────────

class ReportBuilderPreview(BaseModel):
    dimensions: List[str]
    metrics: List[str]
    date_range: str | None = None
    service: str | None = None
    city: str | None = None
