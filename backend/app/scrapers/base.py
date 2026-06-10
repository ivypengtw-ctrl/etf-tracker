from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class HoldingRow:
    stock_ticker: str
    shares: int
    weight_pct: Decimal


class BaseScraper(ABC):
    """All scrapers implement this interface."""

    @abstractmethod
    def scrape(self, etf_code: str) -> list[HoldingRow]:
        """Return today's complete holdings for the given ETF code."""
        ...

    def fetch_html(self, url: str, **kwargs) -> str:
        """HTTP GET with a browser-like User-Agent. Override in tests."""
        import requests
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        resp = requests.get(url, headers=headers, timeout=30, **kwargs)
        resp.raise_for_status()
        return resp.text
