"""add privacy_requests table

Revision ID: c1d2e3f4a5b6
Revises: 477f8af4c50d
Create Date: 2026-06-06
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "c1d2e3f4a5b6"
down_revision = "477f8af4c50d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "privacy_requests",
        sa.Column("id",             sa.String(36),  primary_key=True),
        sa.Column("customer_id",    sa.String(36),  nullable=False, index=True),
        sa.Column("customer_name",  sa.String(80),  nullable=True),
        sa.Column("customer_email", sa.String(120), nullable=True),
        sa.Column("request_type",   sa.String(20),  nullable=False),
        sa.Column("status",         sa.String(20),  nullable=False, server_default="pending"),
        sa.Column("sla_due_at",     sa.DateTime(),  nullable=True),
        sa.Column("sla_breached",   sa.Boolean(),   nullable=False, server_default=sa.false()),
        sa.Column("auto_processed", sa.Boolean(),   nullable=False, server_default=sa.false()),
        sa.Column("resolved_by",    sa.String(120), nullable=True),
        sa.Column("resolution_note", sa.Text(),     nullable=True),
        sa.Column("completed_at",   sa.DateTime(),  nullable=True),
        sa.Column("notes",          sa.Text(),      nullable=True),
        sa.Column("created_at",     sa.DateTime(),  nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",     sa.DateTime(),  nullable=False, server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )
    op.create_index("ix_privacy_requests_customer_id",   "privacy_requests", ["customer_id"])
    op.create_index("ix_privacy_requests_request_type",  "privacy_requests", ["request_type"])
    op.create_index("ix_privacy_requests_status",        "privacy_requests", ["status"])


def downgrade() -> None:
    op.drop_table("privacy_requests")
