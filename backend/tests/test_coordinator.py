import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import patch, MagicMock

from app.scrapers.base import HoldingRow
from app.scrapers.coordinator import run_etf_scraper_for
from app.models import ETF, ETFType, HoldingsSnapshot


FAKE_HOLDINGS = [
    HoldingRow(stock_ticker="2330", shares=5000, weight_pct=Decimal("10.00")),
    HoldingRow(stock_ticker="2454", shares=2000, weight_pct=Decimal("4.00")),
]


async def test_coordinator_saves_snapshots(db):
    etf = ETF(code="0050", name="Test ETF", type=ETFType.stock, fund_company="元大")
    db.add(etf)
    await db.flush()

    mock_scraper = MagicMock()
    mock_scraper.scrape.return_value = FAKE_HOLDINGS
    await run_etf_scraper_for(db, etf, scraper=mock_scraper, target_date=date(2026, 6, 10))

    from sqlalchemy import select
    result = await db.execute(
        select(HoldingsSnapshot).where(
            HoldingsSnapshot.etf_id == etf.id,
            HoldingsSnapshot.snapshot_date == date(2026, 6, 10),
        )
    )
    snapshots = result.scalars().all()
    assert len(snapshots) == 2
    tickers = {s.stock_ticker for s in snapshots}
    assert "2330" in tickers
    assert "2454" in tickers
