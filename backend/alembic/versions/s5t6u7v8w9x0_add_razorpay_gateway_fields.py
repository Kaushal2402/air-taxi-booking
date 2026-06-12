"""add razorpay gateway fields to payments and refunds

Revision ID: s5t6u7v8w9x0
Revises: r4s5t6u7v8w9
Create Date: 2026-06-12
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision = "s5t6u7v8w9x0"
down_revision = "r4s5t6u7v8w9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("gateway_order_id", sa.String(255), nullable=True))
    op.add_column("refunds",  sa.Column("gateway_refund_id", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("payments", "gateway_order_id")
    op.drop_column("refunds",  "gateway_refund_id")
