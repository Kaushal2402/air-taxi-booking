"""add_operator_fleet_crew_routes_tables

Revision ID: m5m6m7_operator_fleet_crew_routes
Revises: h8i9j0k1l2m3
Create Date: 2026-06-11

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'm5m6m7_operator_fleet_crew_routes'
down_revision = 'h8i9j0k1l2m3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'operator_aircraft',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('operator_id', sa.String(36), sa.ForeignKey('operators.id'), nullable=False, index=True),
        sa.Column('registration_mark', sa.String(20), nullable=False, unique=True, index=True),
        sa.Column('aircraft_type_id', sa.String(36), nullable=True),
        sa.Column('aircraft_type_name', sa.String(100), nullable=False),
        sa.Column('serial_number', sa.String(50), nullable=True),
        sa.Column('year_of_manufacture', sa.Integer, nullable=True),
        sa.Column('seat_capacity', sa.Integer, nullable=False),
        sa.Column('mtow_kg', sa.Integer, nullable=False),
        sa.Column('range_nm', sa.Integer, nullable=False),
        sa.Column('endurance_hours', sa.String(20), nullable=True),
        sa.Column('home_base_id', sa.String(36), nullable=True),
        sa.Column('home_base_name', sa.String(100), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='submitted'),
        sa.Column('total_flight_hours', sa.Integer, nullable=False, server_default='0'),
        sa.Column('total_cycles', sa.Integer, nullable=False, server_default='0'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )

    op.create_table(
        'aircraft_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('aircraft_id', sa.String(36), sa.ForeignKey('operator_aircraft.id'), nullable=False, index=True),
        sa.Column('doc_type', sa.String(80), nullable=False),
        sa.Column('doc_number', sa.String(80), nullable=True),
        sa.Column('issued_date', sa.Date, nullable=True),
        sa.Column('expiry_date', sa.Date, nullable=True),
        sa.Column('is_permanent', sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column('file_url', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

    op.create_table(
        'aircraft_maintenance_windows',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('aircraft_id', sa.String(36), sa.ForeignKey('operator_aircraft.id'), nullable=False, index=True),
        sa.Column('task', sa.String(200), nullable=False),
        sa.Column('start_dt', sa.DateTime, nullable=False),
        sa.Column('end_dt', sa.DateTime, nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='upcoming'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

    op.create_table(
        'operator_crew_members',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('operator_id', sa.String(36), sa.ForeignKey('operators.id'), nullable=False, index=True),
        sa.Column('name', sa.String(80), nullable=False),
        sa.Column('crew_role', sa.String(20), nullable=False),
        sa.Column('license_no', sa.String(60), nullable=True),
        sa.Column('employee_id', sa.String(40), nullable=True),
        sa.Column('email', sa.String(150), nullable=True),
        sa.Column('phone', sa.String(30), nullable=True),
        sa.Column('home_base_name', sa.String(100), nullable=True),
        sa.Column('medical_expiry', sa.Date, nullable=True),
        sa.Column('total_flight_hours', sa.Integer, nullable=False, server_default='0'),
        sa.Column('duty_hours_month', sa.Integer, nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='submitted'),
        sa.Column('availability', sa.String(30), nullable=False, server_default='Available'),
        sa.Column('joined_date', sa.Date, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )

    op.create_table(
        'crew_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('crew_member_id', sa.String(36), sa.ForeignKey('operator_crew_members.id'), nullable=False, index=True),
        sa.Column('doc_type', sa.String(80), nullable=False),
        sa.Column('doc_number', sa.String(80), nullable=True),
        sa.Column('issued_date', sa.Date, nullable=True),
        sa.Column('expiry_date', sa.Date, nullable=True),
        sa.Column('is_permanent', sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column('file_url', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

    op.create_table(
        'crew_type_ratings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('crew_member_id', sa.String(36), sa.ForeignKey('operator_crew_members.id'), nullable=False, index=True),
        sa.Column('aircraft_type_id', sa.String(36), nullable=True),
        sa.Column('aircraft_type_name', sa.String(100), nullable=False),
        sa.Column('rating_number', sa.String(60), nullable=True),
        sa.Column('is_current', sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column('expiry_date', sa.Date, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

    op.create_table(
        'operator_routes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('operator_id', sa.String(36), sa.ForeignKey('operators.id'), nullable=False, index=True),
        sa.Column('origin_code', sa.String(10), nullable=False),
        sa.Column('origin_name', sa.String(100), nullable=False),
        sa.Column('destination_code', sa.String(10), nullable=False),
        sa.Column('destination_name', sa.String(100), nullable=False),
        sa.Column('distance_nm', sa.Integer, nullable=False),
        sa.Column('est_duration_min', sa.Integer, nullable=False),
        sa.Column('eligible_aircraft_types', sa.Text, nullable=False, server_default='[]'),
        sa.Column('airspace_notes', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )

    op.create_table(
        'operator_schedules',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('operator_id', sa.String(36), sa.ForeignKey('operators.id'), nullable=False, index=True),
        sa.Column('route_id', sa.String(36), sa.ForeignKey('operator_routes.id'), nullable=False, index=True),
        sa.Column('aircraft_id', sa.String(36), nullable=True),
        sa.Column('aircraft_registration', sa.String(20), nullable=True),
        sa.Column('etd', sa.DateTime, nullable=False),
        sa.Column('eta', sa.DateTime, nullable=False),
        sa.Column('seats_total', sa.Integer, nullable=False, server_default='0'),
        sa.Column('seats_sold', sa.Integer, nullable=False, server_default='0'),
        sa.Column('recurrence', sa.String(200), nullable=True),
        sa.Column('published', sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column('status', sa.String(20), nullable=False, server_default='scheduled'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table('operator_schedules')
    op.drop_table('operator_routes')
    op.drop_table('crew_type_ratings')
    op.drop_table('crew_documents')
    op.drop_table('operator_crew_members')
    op.drop_table('aircraft_maintenance_windows')
    op.drop_table('aircraft_documents')
    op.drop_table('operator_aircraft')
