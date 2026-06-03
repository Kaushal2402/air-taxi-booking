from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class BrandStatus(str, enum.Enum):
    draft = "draft"
    review = "review"
    live = "live"
    archived = "archived"


class AssetStatus(str, enum.Enum):
    live = "live"
    stale = "stale"
    draft = "draft"
    archived = "archived"


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    brand_ref = Column(String(32), unique=True, nullable=False)
    name = Column(String(128), nullable=False)
    scope = Column(String(256), nullable=True)
    status = Column(Enum(BrandStatus), nullable=False, default=BrandStatus.draft)
    # Color tokens
    primary_color = Column(String(16), nullable=True, default="#0F8A5F")
    ink_color = Column(String(16), nullable=True, default="#1A1814")
    surface_color = Column(String(16), nullable=True, default="#FBF9F4")
    bg_color = Column(String(16), nullable=True, default="#F4F1EA")
    success_color = Column(String(16), nullable=True, default="#0F8A5F")
    # Typography
    display_font = Column(String(64), nullable=True, default="Newsreader")
    text_font = Column(String(64), nullable=True, default="IBM Plex Sans")
    corner_radius = Column(String(32), nullable=True, default="Medium · 8px")
    button_style = Column(String(32), nullable=True, default="Solid · pill")
    # Meta
    is_white_label = Column(Boolean, nullable=False, default=False)
    partner_name = Column(String(128), nullable=True)
    published_at = Column(DateTime, nullable=True)
    published_by = Column(String(36), nullable=True)
    notes = Column(Text, nullable=True)
    extra_config = Column(JSON, nullable=True)
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    assets = relationship("BrandAsset", back_populates="profile", cascade="all, delete-orphan")
    touchpoints = relationship("BrandTouchpoint", back_populates="profile", cascade="all, delete-orphan")


class BrandAsset(Base):
    __tablename__ = "brand_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = Column(String(36), ForeignKey("brand_profiles.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String(64), nullable=False)  # wordmark, app_icon, splash, email_header, favicon, invoice_logo
    name = Column(String(128), nullable=False)
    format = Column(String(32), nullable=True)
    used_in = Column(String(128), nullable=True)
    version = Column(String(16), nullable=True)
    file_url = Column(String(512), nullable=True)
    file_size_kb = Column(String(32), nullable=True)
    status = Column(Enum(AssetStatus), nullable=False, default=AssetStatus.draft)
    uploaded_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("BrandProfile", back_populates="assets")


class TouchpointStatus(str, enum.Enum):
    live = "live"
    review = "review"
    disabled = "disabled"


class BrandTouchpoint(Base):
    __tablename__ = "brand_touchpoints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = Column(String(36), ForeignKey("brand_profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(String(256), nullable=True)
    coverage = Column(String(64), nullable=True)
    icon = Column(String(32), nullable=True)
    status = Column(Enum(TouchpointStatus), nullable=False, default=TouchpointStatus.disabled)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("BrandProfile", back_populates="touchpoints")
