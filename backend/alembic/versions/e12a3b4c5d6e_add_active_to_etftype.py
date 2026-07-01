"""add active to etftype enum

Revision ID: e12a3b4c5d6e
Revises: d04657a39abe
Create Date: 2026-06-12

"""
from typing import Union
from alembic import op

revision: str = 'e12a3b4c5d6e'
down_revision: Union[str, None] = 'd04657a39abe'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE etftype ADD VALUE IF NOT EXISTS 'active'")


def downgrade() -> None:
    pass
