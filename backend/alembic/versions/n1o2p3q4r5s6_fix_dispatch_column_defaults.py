"""fix_dispatch_column_defaults

Add server-level DEFAULT values to the two NOT NULL columns that were added
by migration 9312b379c6e6 without them.  Without a server default, running
the migration on a non-empty road_bookings / drivers table would have raised
a constraint violation.

Revision ID: n1o2p3q4r5s6
Revises: m5m6m7_operator_fleet_crew_routes
Create Date: 2026-06-12
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'n1o2p3q4r5s6'
down_revision = 'm5m6m7_operator_fleet_crew_routes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # road_bookings.dispatch_attempts — default 0 (mirrors ORM default)
    op.alter_column(
        'road_bookings', 'dispatch_attempts',
        existing_type=sa.Integer(),
        nullable=False,
        server_default=sa.text('0'),
    )
    # road_bookings.current_radius_km — default 1.5 km (mirrors ORM default)
    op.alter_column(
        'road_bookings', 'current_radius_km',
        existing_type=sa.Float(),
        nullable=False,
        server_default=sa.text('1.5'),
    )


def downgrade() -> None:
    op.alter_column(
        'road_bookings', 'current_radius_km',
        existing_type=sa.Float(),
        nullable=False,
        server_default=None,
    )
    op.alter_column(
        'road_bookings', 'dispatch_attempts',
        existing_type=sa.Integer(),
        nullable=False,
        server_default=None,
    )
