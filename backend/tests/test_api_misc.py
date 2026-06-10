import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db
from app.models import Stock


@pytest.fixture
async def client(db):
    app.dependency_overrides[get_db] = lambda: db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def test_get_stock_not_found(client):
    resp = await client.get("/stocks/9999")
    assert resp.status_code == 404


async def test_create_alert(client):
    resp = await client.post("/alerts", json={
        "channel": "email",
        "contact": "test@example.com",
        "etf_code": "00981A",
        "threshold_pct": "1.5",
    })
    assert resp.status_code == 201
    assert resp.json()["contact"] == "test@example.com"


async def test_delete_alert(client, db):
    create_resp = await client.post("/alerts", json={
        "channel": "line", "contact": "token123",
    })
    alert_id = create_resp.json()["id"]
    delete_resp = await client.delete(f"/alerts/{alert_id}")
    assert delete_resp.status_code == 204
