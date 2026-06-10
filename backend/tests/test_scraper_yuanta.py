from decimal import Decimal
from app.scrapers.yuanta import YuantaScraper

SAMPLE_RESPONSE = """[
  {"ticker":"2330","shares":12000,"weight":8.50},
  {"ticker":"2454","shares":5000,"weight":3.20}
]"""


def test_yuanta_parses_holdings(mocker):
    mocker.patch.object(YuantaScraper, "fetch_html", return_value=SAMPLE_RESPONSE)
    scraper = YuantaScraper()
    rows = scraper.scrape("0050")

    assert len(rows) == 2
    assert rows[0].stock_ticker == "2330"
    assert rows[0].shares == 12000
    assert rows[0].weight_pct == Decimal("8.50")


def test_yuanta_empty_response_returns_empty(mocker):
    mocker.patch.object(YuantaScraper, "fetch_html", return_value="[]")
    scraper = YuantaScraper()
    rows = scraper.scrape("0050")
    assert rows == []
