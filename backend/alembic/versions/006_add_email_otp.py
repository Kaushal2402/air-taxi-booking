"""add admin_email_otps table for 2FA email fallback

Revision ID: 006
Revises: 005
Create Date: 2026-05-27 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_email_otps",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("admin_user_id", sa.String(36), sa.ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("partial_token_hash", sa.String(64), nullable=False, index=True),
        sa.Column("code_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("NOW()"), onupdate=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("admin_email_otps")
