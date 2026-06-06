"""add_doc_grace_until_to_drivers

Revision ID: b3c4d5e6f7a8
Revises: f9e8d7c6b5a4
Create Date: 2026-06-06 00:01:00.000000

"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'f9e8d7c6b5a4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('drivers', sa.Column('doc_grace_until', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('drivers', 'doc_grace_until')
