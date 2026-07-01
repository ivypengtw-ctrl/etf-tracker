# Taiwan ETF Tracker — Plan 2: Scrapers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all scraper modules — one per fund company for daily ETF holdings, plus TWSE/MOPS scrapers for stock company info and manager profiles — and wire them into the scheduler so the database populates automatically every day.

**Architecture:** Each scraper is an isolated module with a single `scrape(etf_code) -> list[HoldingRow]` function. A coordinator calls all scrapers, saves snapshots, then calls `compute_daily_diff` (Plan 1) per ETF. Tests use `pytest-mock` to intercept HTTP calls — no real network in tests.

**Tech Stack:** requests, BeautifulSoup 4, Playwright (JS-heavy pages), pytest-mock

**Prerequisites:** Plan 1 backend must be deployed and the database must have its initial migration applied.

---

## File Map

```
backend/
└── app/
    └── scrapers/
        ├── __init__.py
        ├── base.py            # HoldingRow dataclass + BaseScraper ABC
        ├── coordinator.py     # runs all scrapers, saves snapshots, triggers diff
        ├── yuanta.py          # 元大投信
        ├── fubon.py           # 富邦投信
        ├── cathay.py          # 國泰投信
        ├── ctbc.py            # 中信投信
        ├── capital.py         # 群益投信
        ├── sinopac.py         # 永豐投信
        ├── mops_stocks.py     # TWSE/MOPS 個股行業/業務
        └── mops_managers.py   # MOPS 經理人資料
    └── tests/
        ├── test_base_scraper.py
        ├── test_coordinator.py
        ├── test_scraper_yuanta.py
        └── test_scraper_mops.py
```

---

## Task 1: Base Scraper + HoldingRow

**Files:**
- Create: `backend/app/scrapers/base.py`
- Test: `backend/tests/test_base_scraper.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_base_scraper.py`:

```python
from app.scrapers.base import HoldingRow, BaseScraper
from decimal import Decimal


def test_holding_row_fields():
    row = HoldingRow(stock_ticker="2330", shares=1000, weight_pct=Decimal("5.00"))
    assert row.stock_ticker == "2330"
    assert row.shares == 1000


def test_base_scraper_is_abstract():
    import inspect
    assert inspect.isabstract(BaseScraper)
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_base_scraper.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement `app/scrapers/base.py`**

```python
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
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_base_scraper.py -v
```

Expected: 2 PASSED

- [ ] **Step 5: Commit**

```bash
git add app/scrapers/base.py tests/test_base_scraper.py
git commit -m "feat: BaseScraper ABC and HoldingRow dataclass"
```

---

## Task 2: Yuanta Scraper (元大投信)

**Files:**
- Create: `backend/app/scrapers/yuanta.py`
- Test: `backend/tests/test_scraper_yuanta.py`

元大的 ETF 成分股以 CSV 下載方式提供，URL 格式為：
`https://www.yuantaetfs.com/api/RealBenefitStocks?date=YYYYMMDD&ticker=XXXX`

- [ ] **Step 1: Write failing test with fixture HTML**

Create `tests/test_scraper_yuanta.py`:

```python
import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock

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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_scraper_yuanta.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement `app/scrapers/yuanta.py`**

```python
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
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_scraper_yuanta.py -v
```

Expected: 2 PASSED

- [ ] **Step 5: Commit**

```bash
git add app/scrapers/yuanta.py tests/test_scraper_yuanta.py
git commit -m "feat: Yuanta ETF scraper"
```

---

## Task 3: Remaining Fund Company Scrapers

**Files:**
- Create: `backend/app/scrapers/fubon.py`
- Create: `backend/app/scrapers/cathay.py`
- Create: `backend/app/scrapers/ctbc.py`
- Create: `backend/app/scrapers/capital.py`
- Create: `backend/app/scrapers/sinopac.py`

Each scraper follows the same pattern as Yuanta but may use different URL formats and HTML parsing. Steps below show the Fubon example in full; repeat the same TDD pattern for the remaining four.

- [ ] **Step 1: Investigate each fund company's website manually**

Visit each URL to confirm the actual response format before writing scraper code:

```
富邦投信：https://www.fubonasset.com/etf/
國泰投信：https://www.cathaysite.com.tw/
中信投信：https://www.ctbcassetmanagement.com.tw/
群益投信：https://www.capitalfund.com.tw/
永豐投信：https://www.sinfund.com.tw/
```

For each site, find the URL that returns ETF holdings data (often a CSV download or JSON endpoint).

- [ ] **Step 2: Write `app/scrapers/fubon.py`** (HTML table parsing example)

```python
from decimal import Decimal
from bs4 import BeautifulSoup
from app.scrapers.base import BaseScraper, HoldingRow


class FubonScraper(BaseScraper):
    # Replace with the actual holdings URL after manual investigation in Step 1
    BASE_URL = "https://www.fubonasset.com/etf/{etf_code}/holdings"

    def scrape(self, etf_code: str) -> list[HoldingRow]:
        url = self.BASE_URL.format(etf_code=etf_code)
        html = self.fetch_html(url)
        soup = BeautifulSoup(html, "html.parser")

        rows: list[HoldingRow] = []
        # Adjust the CSS selector to match the actual table on the site
        for tr in soup.select("table.holdings-table tbody tr"):
            cells = tr.find_all("td")
            if len(cells) < 3:
                continue
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
        return rows
```

- [ ] **Step 3: Write `app/scrapers/cathay.py`** using the same pattern as fubon.py (adjust URL and selectors per investigation).

- [ ] **Step 4: Write `app/scrapers/ctbc.py`** — if the site uses JavaScript rendering, use Playwright:

```python
from decimal import Decimal
from playwright.sync_api import sync_playwright
from app.scrapers.base import BaseScraper, HoldingRow


class CTBCScraper(BaseScraper):
    BASE_URL = "https://www.ctbcassetmanagement.com.tw/etf/{etf_code}"

    def scrape(self, etf_code: str) -> list[HoldingRow]:
        url = self.BASE_URL.format(etf_code=etf_code)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url)
            page.wait_for_selector("table.holdings", timeout=10000)
            html = page.content()
            browser.close()

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        rows = []
        for tr in soup.select("table.holdings tbody tr"):
            cells = tr.find_all("td")
            if len(cells) < 3:
                continue
            rows.append(HoldingRow(
                stock_ticker=cells[0].get_text(strip=True),
                shares=int(cells[1].get_text(strip=True).replace(",", "")),
                weight_pct=Decimal(cells[2].get_text(strip=True).replace("%", "")),
            ))
        return rows
```

- [ ] **Step 5: Write `app/scrapers/capital.py`** and `app/scrapers/sinopac.py`** using the pattern that matches each site.

- [ ] **Step 6: Write one test per scraper** using the same mock pattern as `test_scraper_yuanta.py`.

- [ ] **Step 7: Commit all scrapers**

```bash
git add app/scrapers/ tests/test_scraper_*.py
git commit -m "feat: fund company ETF scrapers (Fubon, Cathay, CTBC, Capital, Sinopac)"
```

---

## Task 4: MOPS Stock Scraper

**Files:**
- Create: `backend/app/scrapers/mops_stocks.py`
- Test: `backend/tests/test_scraper_mops.py`

MOPS 上市公司基本資料 API：
`https://mops.twse.com.tw/mops/web/ajax_t51sb01` (POST request)

- [ ] **Step 1: Write failing test**

Create `tests/test_scraper_mops.py`:

```python
from unittest.mock import patch
from app.scrapers.mops_stocks import MopsStockScraper

SAMPLE_HTML = """
<html><body>
<table>
<tr><td>統一編號</td><td>公司名稱</td><td>產業類別</td><td>成立日期</td><td>營業項目</td></tr>
<tr><td>23454</td><td>聯發科技</td><td>半導體業</td><td>1997-05-28</td><td>IC設計、無線通訊晶片</td></tr>
</table>
</body></html>
"""


def test_mops_parses_stock_info(mocker):
    mocker.patch.object(MopsStockScraper, "fetch_html", return_value=SAMPLE_HTML)
    scraper = MopsStockScraper()
    info = scraper.scrape_stock("2454")

    assert info["name"] == "聯發科技"
    assert info["industry"] == "半導體業"
    assert info["founding_year"] == 1997
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_scraper_mops.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement `app/scrapers/mops_stocks.py`**

```python
import re
from bs4 import BeautifulSoup
import requests


class MopsStockScraper:
    MOPS_URL = "https://mops.twse.com.tw/mops/web/ajax_t51sb01"

    def scrape_stock(self, ticker: str) -> dict:
        resp = requests.post(
            self.MOPS_URL,
            data={"encodeURIComponent": 1, "step": 1, "firstin": 1, "co_id": ticker},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=30,
        )
        return self._parse(resp.text)

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
                data["name"] = cells[1].get_text(strip=True)
                data["industry"] = cells[2].get_text(strip=True)
                date_text = cells[3].get_text(strip=True)
                year_match = re.search(r"(\d{4})", date_text)
                data["founding_year"] = int(year_match.group(1)) if year_match else None
                data["main_business"] = cells[4].get_text(strip=True)
                break
        return data
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_scraper_mops.py -v
```

Expected: 1 PASSED

- [ ] **Step 5: Commit**

```bash
git add app/scrapers/mops_stocks.py tests/test_scraper_mops.py
git commit -m "feat: MOPS stock info scraper"
```

---

## Task 5: MOPS Manager Scraper

**Files:**
- Create: `backend/app/scrapers/mops_managers.py`

- [ ] **Step 1: Implement `app/scrapers/mops_managers.py`**

MOPS 基金公開說明書 URL: `https://doc.twse.com.tw/server-java/t57sb01?id={fund_id}`

```python
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
        # Parse manager name from the fund prospectus table
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
```

- [ ] **Step 2: Write and run quick test**

```python
# In tests/test_scraper_mops.py — append:
from app.scrapers.mops_managers import MopsManagerScraper

MANAGER_HTML = """
<html><body><table>
<tr><td>基金經理人</td><td>林彥名</td></tr>
<tr><td>學歷</td><td>台灣大學財務金融所</td></tr>
<tr><td>年資</td><td>10年</td></tr>
</table></body></html>
"""

def test_mops_manager_parsing(mocker):
    scraper = MopsManagerScraper()
    info = scraper._parse(MANAGER_HTML)
    assert info["name"] == "林彥名"
    assert info["experience_years"] == 10
```

```bash
pytest tests/test_scraper_mops.py -v
```

Expected: 2 PASSED

- [ ] **Step 3: Commit**

```bash
git add app/scrapers/mops_managers.py tests/test_scraper_mops.py
git commit -m "feat: MOPS manager profile scraper"
```

---

## Task 6: Scraper Coordinator

**Files:**
- Create: `backend/app/scrapers/coordinator.py`
- Test: `backend/tests/test_coordinator.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_coordinator.py`:

```python
import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import patch, AsyncMock, MagicMock

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

    with patch("app.scrapers.coordinator.YuantaScraper") as MockScraper:
        instance = MockScraper.return_value
        instance.scrape.return_value = FAKE_HOLDINGS
        await run_etf_scraper_for(db, etf, scraper=instance, target_date=date(2026, 6, 10))

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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_coordinator.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement `app/scrapers/coordinator.py`**

```python
import logging
from datetime import date

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ETF, HoldingsSnapshot
from app.scrapers.base import BaseScraper, HoldingRow
from app.scrapers.yuanta import YuantaScraper
from app.scrapers.fubon import FubonScraper
from app.scrapers.cathay import CathayScraper
from app.scrapers.ctbc import CTBCScraper
from app.scrapers.capital import CapitalScraper
from app.scrapers.sinopac import SinopacScraper
from app.services.diff_engine import compute_daily_diff

logger = logging.getLogger(__name__)

COMPANY_SCRAPER_MAP = {
    "元大": YuantaScraper,
    "富邦": FubonScraper,
    "國泰": CathayScraper,
    "中信": CTBCScraper,
    "群益": CapitalScraper,
    "永豐": SinopacScraper,
}


async def run_etf_scraper_for(
    db: AsyncSession,
    etf: ETF,
    scraper: BaseScraper,
    target_date: date,
) -> None:
    try:
        holdings = scraper.scrape(etf.code)
    except Exception as exc:
        logger.error("Scraper failed for %s: %s", etf.code, exc)
        return

    # Replace today's snapshot atomically
    await db.execute(
        delete(HoldingsSnapshot).where(
            HoldingsSnapshot.etf_id == etf.id,
            HoldingsSnapshot.snapshot_date == target_date,
        )
    )
    for row in holdings:
        db.add(HoldingsSnapshot(
            etf_id=etf.id,
            snapshot_date=target_date,
            stock_ticker=row.stock_ticker,
            shares=row.shares,
            weight_pct=row.weight_pct,
        ))
    await db.flush()

    changes = await compute_daily_diff(db, etf.id, target_date)
    for change in changes:
        db.add(change)
    await db.flush()
    logger.info("Scraped %s: %d holdings, %d changes", etf.code, len(holdings), len(changes))


async def run_all_scrapers(db: AsyncSession, target_date: date) -> None:
    from sqlalchemy import select
    etfs_result = await db.execute(select(ETF))
    etfs = etfs_result.scalars().all()

    for etf in etfs:
        scraper_cls = COMPANY_SCRAPER_MAP.get(etf.fund_company[:2])
        if not scraper_cls:
            logger.warning("No scraper for fund company: %s", etf.fund_company)
            continue
        scraper = scraper_cls()
        await run_etf_scraper_for(db, etf, scraper, target_date)
```

- [ ] **Step 4: Wire `run_all_scrapers` into the scheduler** in `app/scheduler.py`:

Replace the placeholder in `_run_daily_etf_update`:

```python
from app.scrapers.coordinator import run_all_scrapers

async def _run_daily_etf_update():
    async with AsyncSessionLocal() as db:
        async with db.begin():
            await run_all_scrapers(db, date.today())
            await check_and_notify(db, date.today())
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_coordinator.py -v
```

Expected: 1 PASSED

- [ ] **Step 6: Commit**

```bash
git add app/scrapers/coordinator.py app/scheduler.py tests/test_coordinator.py
git commit -m "feat: scraper coordinator wires all scrapers and diff engine"
```

---

## Task 7: Manual End-to-End Smoke Test

- [ ] **Step 1: Seed one ETF and run the coordinator manually**

```python
# Run from backend/ directory as a one-off script: python -m app.seed
# Create backend/app/seed.py:
import asyncio
from app.database import AsyncSessionLocal
from app.models import ETF, ETFType
from app.scrapers.coordinator import run_all_scrapers
from datetime import date

async def main():
    async with AsyncSessionLocal() as db:
        async with db.begin():
            etf = ETF(code="0050", name="元大台灣50", type=ETFType.stock, fund_company="元大")
            db.add(etf)
        async with db.begin():
            await run_all_scrapers(db, date.today())

asyncio.run(main())
```

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker \
python -m app.seed
```

Expected: log output showing holdings scraped and diffs computed.

- [ ] **Step 2: Verify via API**

```bash
curl http://localhost:8000/etfs/0050/changes
```

Expected: JSON response with holdings changes.

- [ ] **Step 3: Commit seed script**

```bash
git add app/seed.py
git commit -m "chore: seed script for manual e2e testing"
```
