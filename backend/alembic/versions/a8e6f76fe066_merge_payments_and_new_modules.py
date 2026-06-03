"""merge_payments_and_new_modules

Revision ID: a8e6f76fe066
Revises: bb15508279ff, c3d4e5f6a7b8
Create Date: 2026-06-03 23:10:32.633534

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8e6f76fe066'
down_revision: Union[str, None] = ('bb15508279ff', 'c3d4e5f6a7b8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
