"""add_booking_type_to_tickets

Revision ID: 0b72e45cdc5f
Revises: b4c5d6e7f8a9
Create Date: 2026-06-10 23:35:03.588805

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0b72e45cdc5f'
down_revision: Union[str, None] = 'b4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tickets', sa.Column('linked_booking_type', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('tickets', 'linked_booking_type')
