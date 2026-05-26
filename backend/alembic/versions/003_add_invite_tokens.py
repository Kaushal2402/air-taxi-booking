"""add admin invite tokens table

Revision ID: 003
Revises: 002
Create Date: 2026-05-26 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_invite_tokens",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column(
            "admin_user_id",
            sa.String(36),
            sa.ForeignKey("admin_users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_admin_invite_tokens_admin_user_id", "admin_invite_tokens", ["admin_user_id"])
    op.create_index("ix_admin_invite_tokens_token_hash", "admin_invite_tokens", ["token_hash"])


def downgrade() -> None:
    op.drop_index("ix_admin_invite_tokens_token_hash", table_name="admin_invite_tokens")
    op.drop_index("ix_admin_invite_tokens_admin_user_id", table_name="admin_invite_tokens")
    op.drop_table("admin_invite_tokens")
