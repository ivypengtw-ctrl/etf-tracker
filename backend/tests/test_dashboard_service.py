import uuid
from datetime import date
from decimal import Decimal

import pytest

from app.models import ETF, ETFType, HoldingsChange, ChangeType, Stock
from app.services.dashboard import get_summary_stats, get_cross_etf_rankings
from app.services.summary_text import generate_summary_text


@pytest.fixture
async def two_etfs(db):
    etf_a = ETF(id=uuid.uuid4(), code="00981A", name="ETF A", type=ETFType.stock, fund_company="Co A")
    etf_b = ETF(id=uuid.uuid4(), code="00878", name="ETF B", type=ETFType.stock, fund_company="Co B")
    db.add_all([etf_a, etf_b])
    await db.flush()
    return etf_a, etf_b


async def _add_change(db, etf_id, ticker, ctype, delta, amount):
    db.add(HoldingsChange(
        etf_id=etf_id,
        change_date=date(2026, 6, 10),
        stock_ticker=ticker,
        change_type=ctype,
        shares_before=0,
        shares_after=abs(delta),
        shares_delta=delta,
        amount_billion=Decimal(str(amount)),
    ))


async def test_total_buy_sell_aggregation(db, two_etfs):
    etf_a, etf_b = two_etfs
    target_date = date(2026, 6, 10)
    await _add_change(db, etf_a.id, "2454", ChangeType.added, 1000, "22.8")
    await _add_change(db, etf_b.id, "2330", ChangeType.increased, 500, "8.4")
    await _add_change(db, etf_a.id, "2382", ChangeType.removed, -800, "-19.1")
    await db.flush()

    stats = await get_summary_stats(db, target_date)

    assert stats["total_buy_billion"] == Decimal("31.2")
    assert stats["total_sell_billion"] == Decimal("-19.1")
    assert stats["etf_count_buy"] == 2
    assert stats["etf_count_sell"] == 1


async def test_cross_etf_buys(db, two_etfs):
    etf_a, etf_b = two_etfs
    target_date = date(2026, 6, 10)
    # Both ETFs buy 2454
    await _add_change(db, etf_a.id, "2454", ChangeType.added, 1000, "13.0")
    await _add_change(db, etf_b.id, "2454", ChangeType.increased, 500, "7.0")
    await db.flush()

    rankings = await get_cross_etf_rankings(db, target_date, direction="buy", top_n=3)

    assert rankings[0]["ticker"] == "2454"
    assert rankings[0]["etf_count"] == 2
    assert rankings[0]["total_amount_billion"] == Decimal("20.0")


def test_summary_text_format():
    text = generate_summary_text(
        total_buy=Decimal("79.4"),
        total_sell=Decimal("-35.9"),
        top_industry="半導體業",
        top_industry_amount=Decimal("36.2"),
        top_etf_code="00981A",
        top_etf_name="主動統一台股增長",
        top_etf_amount=Decimal("22.8"),
    )
    assert "79.4 億" in text
    assert "35.9 億" in text
    assert "00981A" in text
