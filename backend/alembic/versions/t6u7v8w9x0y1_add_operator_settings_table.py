"""add operator_settings table

Revision ID: t6u7v8w9x0y1
Revises: s5t6u7v8w9x0
Create Date: 2026-06-13
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "t6u7v8w9x0y1"
down_revision = "s5t6u7v8w9x0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "operator_settings",
        sa.Column("operator_id", sa.String(36), sa.ForeignKey("operators.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("default_manifest_cutoff_min", sa.Integer(), nullable=True, server_default="60"),
        sa.Column("default_checklist_template", sa.Text(), nullable=True),
        sa.Column("locale", sa.String(10), nullable=True, server_default="en"),
        sa.Column("timezone", sa.String(60), nullable=True, server_default="Asia/Kolkata"),
        sa.Column("public_contact_email", sa.String(255), nullable=True),
        sa.Column("public_contact_phone", sa.String(30), nullable=True),
        sa.Column("public_contact_name", sa.String(200), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("operator_settings")
