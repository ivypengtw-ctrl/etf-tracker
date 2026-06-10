from app.models import ETF, FundManager, HoldingsSnapshot, HoldingsChange, Stock, AlertSubscription

def test_models_importable():
    assert ETF.__tablename__ == "etfs"
    assert FundManager.__tablename__ == "fund_managers"
    assert HoldingsSnapshot.__tablename__ == "holdings_snapshots"
    assert HoldingsChange.__tablename__ == "holdings_changes"
    assert Stock.__tablename__ == "stocks"
    assert AlertSubscription.__tablename__ == "alert_subscriptions"
