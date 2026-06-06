"""add_sos_events_table

Revision ID: f9e8d7c6b5a4
Revises: 72b323e01867
Create Date: 2026-06-06 00:00:00.000000

"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f9e8d7c6b5a4'
down_revision: Union[str, None] = '72b323e01867'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'sos_events',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('booking_id', sa.String(36), nullable=True),
        sa.Column('booking_type', sa.String(10), nullable=True),
        sa.Column('triggered_by', sa.String(10), nullable=False),
        sa.Column('triggered_by_id', sa.String(36), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lng', sa.Float(), nullable=True),
        sa.Column('contact_number_dialled', sa.String(20), nullable=True),
        sa.Column('location_shared', sa.Boolean(), nullable=True),
        sa.Column('ops_alerted', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('resolved_by', sa.String(120), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_sos_events_booking_id', 'sos_events', ['booking_id'])
    op.create_index('ix_sos_events_triggered_by_id', 'sos_events', ['triggered_by_id'])


def downgrade() -> None:
    op.drop_index('ix_sos_events_triggered_by_id', table_name='sos_events')
    op.drop_index('ix_sos_events_booking_id', table_name='sos_events')
    op.drop_table('sos_events')
