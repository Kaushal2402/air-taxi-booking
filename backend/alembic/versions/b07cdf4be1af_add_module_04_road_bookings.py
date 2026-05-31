"""add_module_04_road_bookings

Revision ID: b07cdf4be1af
Revises: daab56248ef4
Create Date: 2026-05-31 10:23:51.733260

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b07cdf4be1af'
down_revision: Union[str, None] = 'daab56248ef4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── road_bookings ─────────────────────────────────────────────────────────
    op.create_table(
        'road_bookings',
        sa.Column('booking_ref', sa.String(length=20), nullable=False),
        sa.Column('customer_id', sa.String(length=36), nullable=True),
        sa.Column('driver_id', sa.String(length=36), nullable=True),
        sa.Column('service_type', sa.String(length=30), nullable=False),
        sa.Column('vehicle_class', sa.String(length=40), nullable=True),
        sa.Column('pickup_address', sa.String(length=500), nullable=False),
        sa.Column('pickup_lat', sa.Float(), nullable=True),
        sa.Column('pickup_lng', sa.Float(), nullable=True),
        sa.Column('drop_address', sa.String(length=500), nullable=False),
        sa.Column('drop_lat', sa.Float(), nullable=True),
        sa.Column('drop_lng', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='Requested'),
        sa.Column('fare_estimate_minor', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('fare_final_minor', sa.Integer(), nullable=True),
        sa.Column('distance_km', sa.Float(), nullable=True),
        sa.Column('duration_min', sa.Integer(), nullable=True),
        sa.Column('surge_multiplier', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('payment_method', sa.String(length=30), nullable=True),
        sa.Column('promo_code', sa.String(length=100), nullable=True),
        sa.Column('promo_discount_minor', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('internal_reason', sa.Text(), nullable=True),
        sa.Column('flagged', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('flag_reason', sa.String(length=500), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('driver_vehicle_plate', sa.String(length=20), nullable=True),
        sa.Column('driver_vehicle_model', sa.String(length=100), nullable=True),
        sa.Column('customer_phone', sa.String(length=20), nullable=True),
        sa.Column('customer_ride_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('customer_rating', sa.Float(), nullable=True),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id']),
        sa.ForeignKeyConstraint(['driver_id'], ['drivers.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_road_bookings_booking_ref'), 'road_bookings', ['booking_ref'], unique=True)
    op.create_index(op.f('ix_road_bookings_customer_id'), 'road_bookings', ['customer_id'], unique=False)
    op.create_index(op.f('ix_road_bookings_driver_id'), 'road_bookings', ['driver_id'], unique=False)

    # ── booking_admin_notes ───────────────────────────────────────────────────
    op.create_table(
        'booking_admin_notes',
        sa.Column('booking_id', sa.String(length=36), nullable=False),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['road_bookings.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_booking_admin_notes_booking_id'), 'booking_admin_notes', ['booking_id'], unique=False)

    # ── booking_fare_components ───────────────────────────────────────────────
    op.create_table(
        'booking_fare_components',
        sa.Column('booking_id', sa.String(length=36), nullable=False),
        sa.Column('label', sa.String(length=200), nullable=False),
        sa.Column('rule_ref', sa.String(length=200), nullable=True),
        sa.Column('amount_minor', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['road_bookings.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_booking_fare_components_booking_id'), 'booking_fare_components', ['booking_id'], unique=False)

    # ── booking_timeline_events ───────────────────────────────────────────────
    op.create_table(
        'booking_timeline_events',
        sa.Column('booking_id', sa.String(length=36), nullable=False),
        sa.Column('event', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('tone', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['road_bookings.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_booking_timeline_events_booking_id'), 'booking_timeline_events', ['booking_id'], unique=False)

    # ── disputes ──────────────────────────────────────────────────────────────
    op.create_table(
        'disputes',
        sa.Column('dispute_ref', sa.String(length=20), nullable=False),
        sa.Column('booking_id', sa.String(length=36), nullable=False),
        sa.Column('reason', sa.String(length=500), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(length=10), nullable=False, server_default='medium'),
        sa.Column('stage', sa.String(length=30), nullable=False, server_default='open'),
        sa.Column('action', sa.String(length=30), nullable=True),
        sa.Column('refund_amount_minor', sa.Integer(), nullable=True),
        sa.Column('driver_clawback_minor', sa.Integer(), nullable=True),
        sa.Column('resolution_note', sa.Text(), nullable=True),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['road_bookings.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_id'),
    )
    op.create_index(op.f('ix_disputes_booking_id'), 'disputes', ['booking_id'], unique=True)
    op.create_index(op.f('ix_disputes_dispute_ref'), 'disputes', ['dispute_ref'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_disputes_dispute_ref'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_booking_id'), table_name='disputes')
    op.drop_table('disputes')
    op.drop_index(op.f('ix_booking_timeline_events_booking_id'), table_name='booking_timeline_events')
    op.drop_table('booking_timeline_events')
    op.drop_index(op.f('ix_booking_fare_components_booking_id'), table_name='booking_fare_components')
    op.drop_table('booking_fare_components')
    op.drop_index(op.f('ix_booking_admin_notes_booking_id'), table_name='booking_admin_notes')
    op.drop_table('booking_admin_notes')
    op.drop_index(op.f('ix_road_bookings_driver_id'), table_name='road_bookings')
    op.drop_index(op.f('ix_road_bookings_customer_id'), table_name='road_bookings')
    op.drop_index(op.f('ix_road_bookings_booking_ref'), table_name='road_bookings')
    op.drop_table('road_bookings')
