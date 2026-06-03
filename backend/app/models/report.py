from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class ReportFormat(str, enum.Enum):
    pdf = "pdf"
    xlsx = "xlsx"
    csv = "csv"
    json = "json"


class ReportFrequency(str, enum.Enum):
    once = "once"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class ReportStatus(str, enum.Enum):
    draft = "draft"
    running = "running"
    done = "done"
    failed = "failed"
    scheduled = "scheduled"


class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    description = Column(String(256), nullable=True)
    report_type = Column(String(64), nullable=False)  # standard or custom
    tag = Column(String(32), nullable=True)  # Finance, Tax, Ops, etc.
    icon = Column(String(32), nullable=True)
    default_frequency = Column(Enum(ReportFrequency), nullable=False, default=ReportFrequency.once)
    default_format = Column(Enum(ReportFormat), nullable=False, default=ReportFormat.pdf)
    config = Column(JSON, nullable=True)  # dimensions, metrics, filters
    is_standard = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    schedules = relationship("ReportSchedule", back_populates="template", cascade="all, delete-orphan")
    exports = relationship("ReportExport", back_populates="template", cascade="all, delete-orphan")


class ReportSchedule(Base):
    __tablename__ = "report_schedules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = Column(String(36), ForeignKey("report_templates.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False)
    frequency = Column(Enum(ReportFrequency), nullable=False)
    format = Column(Enum(ReportFormat), nullable=False)
    recipients = Column(Text, nullable=False)  # comma-separated emails
    is_active = Column(Boolean, nullable=False, default=True)
    next_run_at = Column(DateTime, nullable=True)
    last_run_at = Column(DateTime, nullable=True)
    config = Column(JSON, nullable=True)
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    template = relationship("ReportTemplate", back_populates="schedules")


class ReportExport(Base):
    __tablename__ = "report_exports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = Column(String(36), ForeignKey("report_templates.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(128), nullable=False)
    format = Column(Enum(ReportFormat), nullable=False)
    status = Column(Enum(ReportStatus), nullable=False, default=ReportStatus.running)
    file_url = Column(String(512), nullable=True)
    file_size_kb = Column(String(32), nullable=True)
    error_message = Column(Text, nullable=True)
    config = Column(JSON, nullable=True)
    requested_by = Column(String(36), nullable=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    template = relationship("ReportTemplate", back_populates="exports")
