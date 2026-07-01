from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional
from pydantic import BaseModel


class FundManagerOut(BaseModel):
    id: UUID
    name: str
    education: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    past_funds: Optional[list[dict]] = None
    model_config = {"from_attributes": True}


class ETFDailySummary(BaseModel):
    added_count: int = 0
    removed_count: int = 0
    buy_billion: Optional[Decimal] = None
    sell_billion: Optional[Decimal] = None
    last_change_date: Optional[date] = None


class ETFOut(BaseModel):
    id: UUID
    code: str
    name: str
    type: str
    fund_company: str
    inception_date: Optional[date] = None
    nav_change_pct: Optional[Decimal] = None
    all_time_high: Optional[Decimal] = None
    market_cap_billion: Optional[Decimal] = None
    manager: Optional[FundManagerOut] = None
    today_summary: Optional[ETFDailySummary] = None
    model_config = {"from_attributes": True}


class HoldingsChangeOut(BaseModel):
    stock_ticker: str
    stock_name: Optional[str] = None
    change_type: str
    shares_before: int
    shares_after: int
    shares_delta: int
    amount_billion: Optional[Decimal] = None
    model_config = {"from_attributes": True}


class ETFChangesOut(BaseModel):
    etf: ETFOut
    change_date: Optional[date] = None
    changes: list[HoldingsChangeOut]


class CrossETFItem(BaseModel):
    ticker: str
    name: Optional[str] = None
    etf_count: int
    total_amount_billion: Optional[Decimal] = None


class TopETFItem(BaseModel):
    etf_code: str
    etf_name: str
    total_amount_billion: Optional[Decimal] = None


class DashboardSummary(BaseModel):
    date: date
    total_buy_billion: Decimal
    total_sell_billion: Decimal
    etf_count_buy: int
    etf_count_sell: int
    updated_count: int
    total_etf_count: int
    summary_text: str
    top_cross_buys: list[CrossETFItem]
    top_cross_sells: list[CrossETFItem]
    top_etfs_buy: list[TopETFItem]
    top_etfs_sell: list[TopETFItem]


class StockOut(BaseModel):
    ticker: str
    name: str
    industry: Optional[str] = None
    sub_industry: Optional[str] = None
    founding_year: Optional[int] = None
    main_business: Optional[str] = None
    held_by: list[dict] = []
    model_config = {"from_attributes": True}


class HoldingSnapshotOut(BaseModel):
    stock_ticker: str
    stock_name: Optional[str] = None
    industry: Optional[str] = None
    shares: int
    weight_pct: Decimal


class ETFHoldingsOut(BaseModel):
    snapshot_date: Optional[date] = None
    count: int = 0
    holdings: list[HoldingSnapshotOut]


class AlertCreate(BaseModel):
    channel: str
    contact: str
    etf_code: Optional[str] = None
    threshold_pct: Decimal = Decimal("1.0")


class AlertOut(BaseModel):
    id: UUID
    channel: str
    contact: str
    etf_code: Optional[str] = None
    threshold_pct: Decimal
    model_config = {"from_attributes": True}
