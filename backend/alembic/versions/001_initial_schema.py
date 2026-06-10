"""initial_schema

Revision ID: 001
Revises:
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- fund_managers ---
    op.create_table(
        "fund_managers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("education", sa.Text(), nullable=True),
        sa.Column("experience_years", sa.Integer(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("past_funds", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # --- etfs ---
    op.create_table(
        "etfs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "type",
            sa.Enum("stock", "bond", "other", name="etftype"),
            nullable=False,
        ),
        sa.Column("fund_company", sa.String(50), nullable=False),
        sa.Column(
            "manager_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("fund_managers.id"),
            nullable=True,
        ),
        sa.Column("inception_date", sa.Date(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_etfs_code", "etfs", ["code"], unique=True)

    # --- holdings_snapshots ---
    op.create_table(
        "holdings_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "etf_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("etfs.id"),
            nullable=False,
        ),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("stock_ticker", sa.String(10), nullable=False),
        sa.Column("shares", sa.BigInteger(), nullable=False),
        sa.Column("weight_pct", sa.Numeric(5, 2), nullable=False),
    )
    op.create_index(
        "ix_holdings_snapshots_snapshot_date",
        "holdings_snapshots",
        ["snapshot_date"],
    )

    # --- holdings_changes ---
    op.create_table(
        "holdings_changes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "etf_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("etfs.id"),
            nullable=False,
        ),
        sa.Column("change_date", sa.Date(), nullable=False),
        sa.Column("stock_ticker", sa.String(10), nullable=False),
        sa.Column(
            "change_type",
            sa.Enum("added", "removed", "increased", "decreased", name="changetype"),
            nullable=False,
        ),
        sa.Column("shares_before", sa.BigInteger(), nullable=False),
        sa.Column("shares_after", sa.BigInteger(), nullable=False),
        sa.Column("shares_delta", sa.BigInteger(), nullable=False),
        sa.Column("amount_billion", sa.Numeric(10, 2), nullable=True),
    )
    op.create_index(
        "ix_holdings_changes_change_date",
        "holdings_changes",
        ["change_date"],
    )

    # --- stocks ---
    op.create_table(
        "stocks",
        sa.Column("ticker", sa.String(10), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("industry", sa.String(50), nullable=True),
        sa.Column("sub_industry", sa.String(50), nullable=True),
        sa.Column("founding_year", sa.Integer(), nullable=True),
        sa.Column("main_business", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # --- alert_subscriptions ---
    op.create_table(
        "alert_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "channel",
            sa.Enum("email", "line", name="alertchannel"),
            nullable=False,
        ),
        sa.Column("contact", sa.String(200), nullable=False),
        sa.Column("etf_code", sa.String(10), nullable=True),
        sa.Column(
            "threshold_pct",
            sa.Numeric(5, 2),
            nullable=False,
            server_default=sa.text("1.0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("alert_subscriptions")
    op.drop_table("stocks")
    op.drop_index("ix_holdings_changes_change_date", table_name="holdings_changes")
    op.drop_table("holdings_changes")
    op.drop_index(
        "ix_holdings_snapshots_snapshot_date", table_name="holdings_snapshots"
    )
    op.drop_table("holdings_snapshots")
    op.drop_index("ix_etfs_code", table_name="etfs")
    op.drop_table("etfs")
    op.drop_table("fund_managers")
    # Drop custom enum types
    op.execute("DROP TYPE IF EXISTS alertchannel")
    op.execute("DROP TYPE IF EXISTS changetype")
    op.execute("DROP TYPE IF EXISTS etftype")
