"""add catalog tables (vehicle_classes, aircraft_types, service_zones, air_routes)

Revision ID: 008
Revises: 007
Create Date: 2026-05-27
"""
from alembic import op
import sqlalchemy as sa

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'vehicle_classes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('sort_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('seats', sa.Integer, nullable=False, server_default='4'),
        sa.Column('luggage_large', sa.Integer, nullable=False, server_default='2'),
        sa.Column('ac_required', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('pet_friendly', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('airport_eligible', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('vehicle_type', sa.String(200), nullable=True),
        sa.Column('min_year_of_make', sa.Integer, nullable=True),
        sa.Column('min_driver_rating', sa.Float, nullable=True),
        sa.Column('permit_required', sa.String(100), nullable=True),
        sa.Column('max_vehicle_age_years', sa.Integer, nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_vehicle_classes_code', 'vehicle_classes', ['code'])

    op.create_table(
        'aircraft_types',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('category', sa.String(10), nullable=False),
        sa.Column('seats', sa.Integer, nullable=False, server_default='4'),
        sa.Column('mtow_kg', sa.Integer, nullable=True),
        sa.Column('range_nm', sa.Integer, nullable=True),
        sa.Column('cruise_kts', sa.Integer, nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_aircraft_types_code', 'aircraft_types', ['code'])

    op.create_table(
        'service_zones',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('code', sa.String(20), unique=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('polygon', sa.JSON, nullable=False),
        sa.Column('tax_jurisdiction', sa.String(100), nullable=False),
        sa.Column('priority', sa.Integer, nullable=False, server_default='50'),
        sa.Column('surge_cap', sa.Float, nullable=False, server_default='2.0'),
        sa.Column('active_service_codes', sa.JSON, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('version', sa.Integer, nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_service_zones_code', 'service_zones', ['code'])

    op.create_table(
        'air_routes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('code', sa.String(20), unique=True, nullable=False),
        sa.Column('origin_name', sa.String(100), nullable=False),
        sa.Column('origin_code', sa.String(20), nullable=False),
        sa.Column('destination_name', sa.String(100), nullable=False),
        sa.Column('destination_code', sa.String(20), nullable=False),
        sa.Column('category', sa.String(20), nullable=False),
        sa.Column('distance_nm', sa.Float, nullable=False),
        sa.Column('block_time_minutes', sa.Integer, nullable=False),
        sa.Column('eligible_type_codes', sa.JSON, nullable=True),
        sa.Column('authorized_operators', sa.JSON, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_air_routes_code', 'air_routes', ['code'])


def downgrade():
    op.drop_table('air_routes')
    op.drop_table('service_zones')
    op.drop_table('aircraft_types')
    op.drop_table('vehicle_classes')
