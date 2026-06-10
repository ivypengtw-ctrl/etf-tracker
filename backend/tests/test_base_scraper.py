from app.scrapers.base import HoldingRow, BaseScraper
from decimal import Decimal


def test_holding_row_fields():
    row = HoldingRow(stock_ticker="2330", shares=1000, weight_pct=Decimal("5.00"))
    assert row.stock_ticker == "2330"
    assert row.shares == 1000


def test_base_scraper_is_abstract():
    import inspect
    assert inspect.isabstract(BaseScraper)
