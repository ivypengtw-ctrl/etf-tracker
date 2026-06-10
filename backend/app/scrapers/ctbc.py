from decimal import Decimal
from bs4 import BeautifulSoup

from app.scrapers.base import BaseScraper, HoldingRow


class CTBCScraper(BaseScraper):
    BASE_URL = "https://www.ctbcassetmanagement.com.tw/etf/{etf_code}/holdings"

    def scrape(self, etf_code: str) -> list[HoldingRow]:
        url = self.BASE_URL.format(etf_code=etf_code)
        html = self.fetch_html(url)
        soup = BeautifulSoup(html, "html.parser")
        rows = []
        for tr in soup.select("table tbody tr"):
            cells = tr.find_all("td")
            if len(cells) < 3:
                continue
            try:
                ticker = cells[0].get_text(strip=True)
                shares_text = cells[1].get_text(strip=True).replace(",", "")
                weight_text = cells[2].get_text(strip=True).replace("%", "")
                if not ticker or not shares_text.isdigit():
                    continue
                rows.append(HoldingRow(
                    stock_ticker=ticker,
                    shares=int(shares_text),
                    weight_pct=Decimal(weight_text),
                ))
            except (ValueError, TypeError):
                continue
        return rows
