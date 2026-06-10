import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models import ETF, ETFType, FundManager, HoldingsChange, ChangeType, HoldingsSnapshot
from app.database import get_db
from datetime import date
from decimal import Decimal
import uuid


@pytest.fixture
async def client(db):
    app.dependency_overrides[get_db] = lambda: db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def sample_etf(db):
    etf = ETF(code="00981A", name="主動統一台股增長", type=ETFType.stock, fund_company="統一投信")
    db.add(etf)
    await db.flush()
    return etf


async def test_list_etfs_returns_200(client, sample_etf):
    resp = await client.get("/etfs")
    assert resp.status_code == 200
    data = resp.json()
    assert any(e["code"] == "00981A" for e in data)


async def test_get_etf_by_code(client, sample_etf):
    resp = await client.get("/etfs/00981A")
    assert resp.status_code == 200
    assert resp.json()["code"] == "00981A"


async def test_get_etf_not_found(client):
    resp = await client.get("/etfs/XXXXX")
    assert resp.status_code == 404


async def test_get_etf_changes(client, db, sample_etf):
    db.add(HoldingsChange(
        etf_id=sample_etf.id,
        change_date=date(2026, 6, 10),
        stock_ticker="2454",
        change_type=ChangeType.added,
        shares_before=0,
        shares_after=1000,
        shares_delta=1000,
        amount_billion=Decimal("22.8"),
    ))
    await db.flush()

    resp = await client.get("/etfs/00981A/changes?date=2026-06-10")
    assert resp.status_code == 200
    body = resp.json()
    assert body["changes"][0]["stock_ticker"] == "2454"


async def test_list_etfs_search_filter(client, db, sample_etf):
    resp = await client.get("/etfs?search=統一")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
