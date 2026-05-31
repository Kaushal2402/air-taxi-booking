"""add_air_booking_tables

Revision ID: e5a1f2c3b4d5
Revises: d47cf9e3acce
Create Date: 2026-05-31 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5a1f2c3b4d5"
down_revision: Union[str, None] = "d47cf9e3acce"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── air_bookings ──────────────────────────────────────────────────────────
    op.create_table(
        "air_bookings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("booking_ref", sa.String(20), unique=True, nullable=False, index=True),
        # Customer
        sa.Column("customer_id", sa.String(36), sa.ForeignKey("customers.id"), nullable=True, index=True),
        sa.Column("customer_name", sa.String(200), nullable=True),
        sa.Column("customer_phone", sa.String(20), nullable=True),
        # Operator
        sa.Column("operator_id", sa.String(36), nullable=True, index=True),
        sa.Column("operator_name", sa.String(200), nullable=True),
        sa.Column("operator_otp_pct", sa.Float, nullable=True),
        sa.Column("operator_fleet_count", sa.Integer, nullable=True),
        # Aircraft
        sa.Column("aircraft_id", sa.String(36), nullable=True),
        sa.Column("aircraft_registration", sa.String(20), nullable=True),
        sa.Column("aircraft_model", sa.String(100), nullable=True),
        sa.Column("aircraft_seats", sa.Integer, nullable=True),
        sa.Column("aircraft_mtow_kg", sa.Float, nullable=True),
        sa.Column("aircraft_airworthy_until", sa.DateTime, nullable=True),
        # Pilot
        sa.Column("pilot_name", sa.String(200), nullable=True),
        sa.Column("pilot_license", sa.String(100), nullable=True),
        sa.Column("copilot_name", sa.String(200), nullable=True),
        # Service
        sa.Column("service_subtype", sa.String(40), nullable=False),
        sa.Column("service_label", sa.String(100), nullable=True),
        # Route
        sa.Column("route_from", sa.String(100), nullable=False),
        sa.Column("route_to", sa.String(100), nullable=False),
        sa.Column("depart_icao", sa.String(10), nullable=True),
        sa.Column("arrive_icao", sa.String(10), nullable=True),
        sa.Column("distance_nm", sa.Float, nullable=True),
        sa.Column("flight_time_min", sa.Integer, nullable=True),
        # Schedule
        sa.Column("etd", sa.DateTime, nullable=False, index=True),
        sa.Column("eta", sa.DateTime, nullable=True),
        sa.Column("scheduled_date", sa.String(20), nullable=True),
        # Pax & weights
        sa.Column("pax_count", sa.Integer, nullable=False, default=1),
        sa.Column("fuel_weight_kg", sa.Float, nullable=True),
        # Status
        sa.Column("status", sa.String(40), nullable=False, default="Requested", index=True),
        # Fare
        sa.Column("fare_estimate_minor", sa.Integer, nullable=False, default=0),
        sa.Column("fare_final_minor", sa.Integer, nullable=True),
        sa.Column("payment_method", sa.String(30), nullable=True),
        # Admin fields
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("internal_reason", sa.Text, nullable=True),
        sa.Column("reschedule_ref", sa.String(20), nullable=True),
        sa.Column("flagged", sa.Boolean, nullable=False, default=False),
        sa.Column("flag_reason", sa.String(500), nullable=True),
        # Manifest
        sa.Column("manifest_locked", sa.Boolean, nullable=False, default=False),
        sa.Column("manifest_locked_at", sa.DateTime, nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # ── air_booking_passengers ────────────────────────────────────────────────
    op.create_table(
        "air_booking_passengers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("booking_id", sa.String(36), sa.ForeignKey("air_bookings.id"), nullable=False, index=True),
        sa.Column("seq", sa.Integer, nullable=False, default=1),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("age", sa.Integer, nullable=True),
        sa.Column("id_number", sa.String(100), nullable=True),
        sa.Column("body_weight_kg", sa.Float, nullable=False, default=0.0),
        sa.Column("baggage_weight_kg", sa.Float, nullable=False, default=0.0),
        sa.Column("special_notes", sa.Text, nullable=True),
        sa.Column("is_minor", sa.Boolean, nullable=False, default=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # ── charter_quotes ────────────────────────────────────────────────────────
    op.create_table(
        "charter_quotes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("booking_id", sa.String(36), sa.ForeignKey("air_bookings.id"), nullable=False, index=True),
        sa.Column("operator_id", sa.String(36), nullable=False),
        sa.Column("operator_name", sa.String(200), nullable=True),
        sa.Column("aircraft_id", sa.String(36), nullable=True),
        sa.Column("aircraft_registration", sa.String(20), nullable=True),
        sa.Column("aircraft_model", sa.String(100), nullable=True),
        sa.Column("pax_capacity", sa.Integer, nullable=True),
        sa.Column("range_nm", sa.Integer, nullable=True),
        sa.Column("depart_icao", sa.String(10), nullable=True),
        sa.Column("arrive_icao", sa.String(10), nullable=True),
        sa.Column("etd", sa.DateTime, nullable=True),
        sa.Column("eta", sa.DateTime, nullable=True),
        sa.Column("base_fare_minor", sa.Integer, nullable=False, default=0),
        sa.Column("positioning_minor", sa.Integer, nullable=False, default=0),
        sa.Column("night_halt_minor", sa.Integer, nullable=False, default=0),
        sa.Column("catering_minor", sa.Integer, nullable=False, default=0),
        sa.Column("fuel_surcharge_minor", sa.Integer, nullable=False, default=0),
        sa.Column("taxes_minor", sa.Integer, nullable=False, default=0),
        sa.Column("conditions", sa.Text, nullable=True),
        sa.Column("otp_30d_pct", sa.Float, nullable=True),
        sa.Column("score", sa.Integer, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, default="pending"),
        sa.Column("is_recommended", sa.Boolean, nullable=False, default=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # ── air_booking_notes ─────────────────────────────────────────────────────
    op.create_table(
        "air_booking_notes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("booking_id", sa.String(36), sa.ForeignKey("air_bookings.id"), nullable=False, index=True),
        sa.Column("note", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # ── air_booking_timeline ──────────────────────────────────────────────────
    op.create_table(
        "air_booking_timeline",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("booking_id", sa.String(36), sa.ForeignKey("air_bookings.id"), nullable=False, index=True),
        sa.Column("event", sa.String(200), nullable=False),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("tone", sa.String(20), nullable=False, default="info"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("air_booking_timeline")
    op.drop_table("air_booking_notes")
    op.drop_table("charter_quotes")
    op.drop_table("air_booking_passengers")
    op.drop_table("air_bookings")
