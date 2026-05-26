"""add backup codes table

Revision ID: 002
Revises: 001
Create Date: 2026-05-26 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_backup_codes",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column(
            "admin_user_id",
            sa.String(36),
            sa.ForeignKey("admin_users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code_hash", sa.String(255), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_admin_backup_codes_admin_user_id", "admin_backup_codes", ["admin_user_id"])


def downgrade() -> None:
    op.drop_index("ix_admin_backup_codes_admin_user_id", table_name="admin_backup_codes")
    op.drop_table("admin_backup_codes")
