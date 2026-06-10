import pytest
from datetime import date
from decimal import Decimal
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db
from app.models import ETF, ETFType, HoldingsChange, ChangeType


@pytest.fixture
async def client(db):
    app.dependency_overrides[get_db] = lambda: db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def test_dashboard_summary_returns_200(client, db):
    etf = ETF(code="00981A", name="Test ETF", type=ETFType.stock, fund_company="Co")
    db.add(etf)
    await db.flush()
    db.add(HoldingsChange(
        etf_id=etf.id, change_date=date(2026, 6, 10), stock_ticker="2454",
        change_type=ChangeType.added, shares_before=0, shares_after=1000,
        shares_delta=1000, amount_billion=Decimal("22.8"),
    ))
    await db.flush()

    resp = await client.get("/dashboard/summary?date=2026-06-10")
    assert resp.status_code == 200
    body = resp.json()
    assert "total_buy_billion" in body
    assert "summary_text" in body
    assert "top_cross_buys" in body


async def test_dashboard_cross_etf(client):
    resp = await client.get("/dashboard/cross-etf?date=2026-06-10")
    assert resp.status_code == 200
