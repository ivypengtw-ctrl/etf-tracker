from decimal import Decimal
from app.scrapers.fubon import FubonScraper
from app.scrapers.cathay import CathayScraper
from app.scrapers.ctbc import CTBCScraper
from app.scrapers.capital import CapitalScraper
from app.scrapers.sinopac import SinopacScraper

FUBON_JSON = '[{"ticker":"2330","shares":10000,"weight":7.50}]'
CATHAY_JSON = '[{"stockCode":"2454","shares":5000,"weight":3.20}]'
HTML_TABLE = """<html><body><table><tbody>
<tr><td>2330</td><td>10000</td><td>7.50</td></tr>
<tr><td>2454</td><td>5000</td><td>3.20</td></tr>
</tbody></table></body></html>"""


def test_fubon_parses_json(mocker):
    mocker.patch.object(FubonScraper, "fetch_html", return_value=FUBON_JSON)
    rows = FubonScraper().scrape("00762")
    assert len(rows) == 1
    assert rows[0].stock_ticker == "2330"
    assert rows[0].shares == 10000


def test_cathay_parses_json(mocker):
    mocker.patch.object(CathayScraper, "fetch_html", return_value=CATHAY_JSON)
    rows = CathayScraper().scrape("00878")
    assert len(rows) == 1
    assert rows[0].stock_ticker == "2454"


def test_ctbc_parses_html_table(mocker):
    mocker.patch.object(CTBCScraper, "fetch_html", return_value=HTML_TABLE)
    rows = CTBCScraper().scrape("00891")
    assert len(rows) == 2
    assert rows[0].stock_ticker == "2330"
    assert rows[0].weight_pct == Decimal("7.50")


def test_capital_parses_html_table(mocker):
    mocker.patch.object(CapitalScraper, "fetch_html", return_value=HTML_TABLE)
    rows = CapitalScraper().scrape("00902")
    assert len(rows) == 2


def test_sinopac_parses_html_table(mocker):
    mocker.patch.object(SinopacScraper, "fetch_html", return_value=HTML_TABLE)
    rows = SinopacScraper().scrape("00896")
    assert len(rows) == 2


def test_scraper_empty_returns_empty(mocker):
    mocker.patch.object(CTBCScraper, "fetch_html", return_value="<html><body></body></html>")
    rows = CTBCScraper().scrape("00891")
    assert rows == []
