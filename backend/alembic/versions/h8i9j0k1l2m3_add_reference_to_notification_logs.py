"""add_reference_to_notification_logs

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-06-11 00:00:00.000000

"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision = 'h8i9j0k1l2m3'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'notification_logs',
        sa.Column('reference', sa.String(100), nullable=True),
    )
    op.create_index('ix_notification_logs_reference', 'notification_logs', ['reference'])


def downgrade() -> None:
    op.drop_index('ix_notification_logs_reference', 'notification_logs')
    op.drop_column('notification_logs', 'reference')
