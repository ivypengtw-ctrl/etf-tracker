import uuid
from datetime import date
from decimal import Decimal

import pytest

from app.models import ETF, ETFType, HoldingsSnapshot, HoldingsChange, ChangeType
from app.services.diff_engine import compute_daily_diff


@pytest.fixture
async def etf(db):
    obj = ETF(code="00981A", name="Test ETF", type=ETFType.stock, fund_company="Test Co")
    db.add(obj)
    await db.flush()
    return obj


async def _add_snapshot(db, etf_id, snap_date, holdings: dict[str, int]):
    for ticker, shares in holdings.items():
        db.add(HoldingsSnapshot(
            etf_id=etf_id,
            snapshot_date=snap_date,
            stock_ticker=ticker,
            shares=shares,
            weight_pct=Decimal("1.00"),
        ))
    await db.flush()


async def test_new_stock_is_added(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 1000})
    await _add_snapshot(db, etf.id, today, {"2330": 1000, "2454": 500})

    changes = await compute_daily_diff(db, etf.id, today)

    assert len(changes) == 1
    assert changes[0].stock_ticker == "2454"
    assert changes[0].change_type == ChangeType.added
    assert changes[0].shares_before == 0
    assert changes[0].shares_after == 500


async def test_removed_stock(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 1000, "2454": 500})
    await _add_snapshot(db, etf.id, today, {"2330": 1000})

    changes = await compute_daily_diff(db, etf.id, today)

    assert len(changes) == 1
    assert changes[0].stock_ticker == "2454"
    assert changes[0].change_type == ChangeType.removed
    assert changes[0].shares_delta == -500


async def test_increased_shares(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 1000})
    await _add_snapshot(db, etf.id, today, {"2330": 1500})

    changes = await compute_daily_diff(db, etf.id, today)

    assert changes[0].change_type == ChangeType.increased
    assert changes[0].shares_delta == 500


async def test_no_change_produces_no_diff(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 1000})
    await _add_snapshot(db, etf.id, today, {"2330": 1000})

    changes = await compute_daily_diff(db, etf.id, today)

    assert changes == []


async def test_amount_billion_computed_when_price_provided(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 0})
    await _add_snapshot(db, etf.id, today, {"2330": 1000})

    price_map = {"2330": Decimal("1000")}  # 1000 TWD/share
    changes = await compute_daily_diff(db, etf.id, today, price_map=price_map)

    # 1000 lots * 1000 price / 1e8 = 0.01 billion
    assert changes[0].amount_billion == Decimal("0.01")
