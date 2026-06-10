import re
from bs4 import BeautifulSoup
import requests


class MopsStockScraper:
    MOPS_URL = "https://mops.twse.com.tw/mops/web/ajax_t51sb01"

    def scrape_stock(self, ticker: str) -> dict:
        html = self._fetch_post(ticker)
        return self._parse(html)

    def _fetch_post(self, ticker: str) -> str:
        resp = requests.post(
            self.MOPS_URL,
            data={"encodeURIComponent": 1, "step": 1, "firstin": 1, "co_id": ticker},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.text

    def fetch_html(self, url: str, **kwargs) -> str:
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
        resp.raise_for_status()
        return resp.text

    def _parse(self, html: str) -> dict:
        soup = BeautifulSoup(html, "html.parser")
        rows = soup.find_all("tr")
        data: dict = {}
        for row in rows:
            cells = row.find_all("td")
            if len(cells) >= 5:
                first_cell = cells[0].get_text(strip=True)
                # Skip header rows (non-numeric first cell)
                if not re.match(r"^\d+$", first_cell):
                    continue
                data["name"] = cells[1].get_text(strip=True)
                data["industry"] = cells[2].get_text(strip=True)
                date_text = cells[3].get_text(strip=True)
                year_match = re.search(r"(\d{4})", date_text)
                data["founding_year"] = int(year_match.group(1)) if year_match else None
                data["main_business"] = cells[4].get_text(strip=True)
                break
        return data
