"""add channel column to admin_email_otps

Revision ID: 007
Revises: 006
Create Date: 2026-05-27 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "admin_email_otps",
        sa.Column(
            "channel",
            sa.String(5),
            nullable=False,
            server_default="email",
        ),
    )


def downgrade() -> None:
    op.drop_column("admin_email_otps", "channel")
