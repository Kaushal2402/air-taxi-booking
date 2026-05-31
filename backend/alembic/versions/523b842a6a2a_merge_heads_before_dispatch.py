"""merge_heads_before_dispatch

Revision ID: 523b842a6a2a
Revises: 43f9a55765ff, 5e3889d00e5c
Create Date: 2026-05-31 19:15:41.670457

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '523b842a6a2a'
down_revision: Union[str, None] = ('43f9a55765ff', '5e3889d00e5c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
