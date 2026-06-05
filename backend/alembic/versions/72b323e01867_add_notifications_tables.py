"""add_notifications_tables

Revision ID: 72b323e01867
Revises: 84803102581c
Create Date: 2026-06-04 02:43:07.059421

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72b323e01867'
down_revision: Union[str, None] = '84803102581c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect as sa_inspect
    bind = op.get_bind()
    existing = sa_inspect(bind).get_table_names()

    if "notification_templates" not in existing:
        op.create_table(
            "notification_templates",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("template_code", sa.String(50), nullable=False, unique=True),
            sa.Column("event_trigger", sa.String(200), nullable=False, server_default=""),
            sa.Column("channels", sa.String(500), nullable=False, server_default="[]"),
            sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
            sa.Column("category", sa.String(50), nullable=False, server_default="Transactional"),
            sa.Column("push_title", sa.String(200), nullable=True),
            sa.Column("push_body", sa.Text(), nullable=True),
            sa.Column("sms_body", sa.Text(), nullable=True),
            sa.Column("email_subject", sa.String(300), nullable=True),
            sa.Column("email_body", sa.Text(), nullable=True),
            sa.Column("wa_body", sa.Text(), nullable=True),
            sa.Column("priority", sa.String(50), nullable=False, server_default="normal"),
            sa.Column("quiet_hours_override", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("sms_fallback_seconds", sa.Integer(), nullable=False, server_default=sa.text("30")),
            sa.Column("dedup_window_seconds", sa.Integer(), nullable=False, server_default=sa.text("120")),
            sa.Column("sent_30d", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("open_rate", sa.String(10), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        )

    if "notification_logs" not in existing:
        op.create_table(
            "notification_logs",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("template_id", sa.String(36), sa.ForeignKey("notification_templates.id", ondelete="SET NULL"), nullable=True),
            sa.Column("template_name", sa.String(200), nullable=False, server_default=""),
            sa.Column("channel", sa.String(20), nullable=False),
            sa.Column("recipient", sa.String(200), nullable=False, server_default=""),
            sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        )

    if "notification_broadcasts" not in existing:
        op.create_table(
            "notification_broadcasts",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("audience_description", sa.String(300), nullable=False, server_default=""),
            sa.Column("channel", sa.String(100), nullable=False, server_default=""),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
            sa.Column("scheduled_at", sa.DateTime(), nullable=True),
            sa.Column("estimated_reach", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("notification_broadcasts")
    op.drop_table("notification_logs")
    op.drop_table("notification_templates")
