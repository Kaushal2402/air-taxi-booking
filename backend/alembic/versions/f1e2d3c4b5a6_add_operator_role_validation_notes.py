"""add_operator_role_validation_notes

Revision ID: f1e2d3c4b5a6
Revises: c6258df72715
Create Date: 2026-06-10

Documents valid operator_role values. Validation enforced at service layer.
"""
from typing import Sequence, Union

revision = "f1e2d3c4b5a6"
down_revision = "c6258df72715"
branch_labels = None
depends_on = None


def upgrade():
    pass  # Role validation enforced at application layer in operator_auth_service.py


def downgrade():
    pass
