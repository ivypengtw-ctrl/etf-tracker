"""add market_cap_billion to etfs

Revision ID: a1b2c3d4e5f6
Revises: e12a3b4c5d6e
Create Date: 2026-06-26

"""
from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e12a3b4c5d6e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('etfs', sa.Column('market_cap_billion', sa.Numeric(precision=12, scale=1), nullable=True))


def downgrade() -> None:
    op.drop_column('etfs', 'market_cap_billion')
