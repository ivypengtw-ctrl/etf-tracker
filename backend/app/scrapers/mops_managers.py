import re
from bs4 import BeautifulSoup
import requests


class MopsManagerScraper:
    MOPS_URL = "https://mops.twse.com.tw/mops/web/ajax_t56sb10"

    def scrape_manager(self, fund_code: str) -> dict:
        resp = requests.post(
            self.MOPS_URL,
            data={"encodeURIComponent": 1, "step": 1, "fund_id": fund_code},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=30,
        )
        return self._parse(resp.text)

    def _parse(self, html: str) -> dict:
        soup = BeautifulSoup(html, "html.parser")
        data: dict = {}
        name_cell = soup.find("td", string=re.compile("基金經理人"))
        if name_cell and name_cell.find_next_sibling("td"):
            data["name"] = name_cell.find_next_sibling("td").get_text(strip=True)
        edu_cell = soup.find("td", string=re.compile("學歷"))
        if edu_cell and edu_cell.find_next_sibling("td"):
            data["education"] = edu_cell.find_next_sibling("td").get_text(strip=True)
        exp_cell = soup.find("td", string=re.compile("年資|年數"))
        if exp_cell and exp_cell.find_next_sibling("td"):
            exp_text = exp_cell.find_next_sibling("td").get_text(strip=True)
            match = re.search(r"(\d+)", exp_text)
            data["experience_years"] = int(match.group(1)) if match else None
        return data
