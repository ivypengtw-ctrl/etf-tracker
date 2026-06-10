import pytest
from unittest.mock import AsyncMock, patch
from datetime import date
from decimal import Decimal

from app.models import ETF, ETFType, HoldingsChange, ChangeType, AlertSubscription, AlertChannel
from app.services.alert_service import check_and_notify


async def test_alert_fires_when_threshold_exceeded(db):
    etf = ETF(code="00981A", name="Test ETF", type=ETFType.stock, fund_company="Co")
    db.add(etf)
    await db.flush()

    db.add(HoldingsChange(
        etf_id=etf.id, change_date=date(2026, 6, 10), stock_ticker="2454",
        change_type=ChangeType.added, shares_before=0, shares_after=1000,
        shares_delta=1000, amount_billion=Decimal("22.8"),
    ))
    db.add(AlertSubscription(
        channel=AlertChannel.email, contact="user@example.com",
        etf_code="00981A", threshold_pct=Decimal("1.0"),
    ))
    await db.flush()

    with patch("app.services.alert_service._send_email", new_callable=AsyncMock) as mock_send:
        await check_and_notify(db, date(2026, 6, 10))
        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert "user@example.com" in call_args.args or "user@example.com" in str(call_args)


async def test_alert_does_not_fire_below_threshold(db):
    etf = ETF(code="00878", name="ETF B", type=ETFType.stock, fund_company="Co")
    db.add(etf)
    await db.flush()
    db.add(HoldingsChange(
        etf_id=etf.id, change_date=date(2026, 6, 10), stock_ticker="2330",
        change_type=ChangeType.increased, shares_before=900, shares_after=901,
        shares_delta=1, amount_billion=Decimal("0.001"),
    ))
    db.add(AlertSubscription(
        channel=AlertChannel.email, contact="user@example.com",
        etf_code="00878", threshold_pct=Decimal("5.0"),
    ))
    await db.flush()

    with patch("app.services.alert_service._send_email", new_callable=AsyncMock) as mock_send:
        await check_and_notify(db, date(2026, 6, 10))
        mock_send.assert_not_called()
