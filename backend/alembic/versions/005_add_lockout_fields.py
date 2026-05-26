"""add login lockout fields to admin_users

Revision ID: 005
Revises: 004
Create Date: 2026-05-27 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "admin_users",
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "admin_users",
        sa.Column("locked_until", sa.DateTime(timezone=False), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("admin_users", "locked_until")
    op.drop_column("admin_users", "failed_attempts")
