"""add profile fields to admin_users

Revision ID: 004
Revises: 003
Create Date: 2026-05-26 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("admin_users", sa.Column("phone",      sa.String(20),  nullable=True))
    op.add_column("admin_users", sa.Column("avatar_url", sa.String(500), nullable=True))
    op.add_column(
        "admin_users",
        sa.Column("locale", sa.String(10), nullable=False, server_default="en"),
    )


def downgrade() -> None:
    op.drop_column("admin_users", "locale")
    op.drop_column("admin_users", "avatar_url")
    op.drop_column("admin_users", "phone")
