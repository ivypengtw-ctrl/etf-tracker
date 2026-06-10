import json
from decimal import Decimal

from app.scrapers.base import BaseScraper, HoldingRow


class FubonScraper(BaseScraper):
    BASE_URL = "https://www.fubonasset.com/fund/ETF/NAVAndComposition/{etf_code}"

    def scrape(self, etf_code: str) -> list[HoldingRow]:
        url = self.BASE_URL.format(etf_code=etf_code)
        raw = self.fetch_html(url)
        try:
            data = json.loads(raw)
            items = data.get("composition", data) if isinstance(data, dict) else data
        except (json.JSONDecodeError, KeyError):
            return []
        rows = []
        for item in items:
            try:
                rows.append(HoldingRow(
                    stock_ticker=str(item.get("ticker") or item.get("stockCode", "")),
                    shares=int(str(item.get("shares") or item.get("holdingShares", 0)).replace(",", "")),
                    weight_pct=Decimal(str(item.get("weight") or item.get("holdingRatio", "0"))),
                ))
            except (ValueError, TypeError):
                continue
        return rows
