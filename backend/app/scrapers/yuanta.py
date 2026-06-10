import json
from datetime import date
from decimal import Decimal

from app.scrapers.base import BaseScraper, HoldingRow


class YuantaScraper(BaseScraper):
    BASE_URL = "https://www.yuantaetfs.com/api/RealBenefitStocks"

    def scrape(self, etf_code: str) -> list[HoldingRow]:
        today = date.today().strftime("%Y%m%d")
        url = f"{self.BASE_URL}?date={today}&ticker={etf_code}"
        raw = self.fetch_html(url)
        data = json.loads(raw)
        return [
            HoldingRow(
                stock_ticker=str(item["ticker"]),
                shares=int(item["shares"]),
                weight_pct=Decimal(str(item["weight"])),
            )
            for item in data
        ]
