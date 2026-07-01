import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    BigInteger, Date, DateTime, Enum, ForeignKey,
    Integer, Numeric, String, Text, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ETFType(PyEnum):
    stock = "stock"
    bond = "bond"
    active = "active"
    other = "other"


class ChangeType(PyEnum):
    added = "added"
    removed = "removed"
    increased = "increased"
    decreased = "decreased"


class AlertChannel(PyEnum):
    email = "email"
    line = "line"


class FundManager(Base):
    __tablename__ = "fund_managers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    education: Mapped[str | None] = mapped_column(Text)
    experience_years: Mapped[int | None] = mapped_column(Integer)
    bio: Mapped[str | None] = mapped_column(Text)
    past_funds: Mapped[dict | None] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    etfs: Mapped[list["ETF"]] = relationship("ETF", back_populates="manager")


class ETF(Base):
    __tablename__ = "etfs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[ETFType] = mapped_column(Enum(ETFType), nullable=False)
    fund_company: Mapped[str] = mapped_column(String(50), nullable=False)
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fund_managers.id")
    )
    inception_date: Mapped[date | None] = mapped_column(Date)
    nav_change_pct: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    all_time_high: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    market_cap_billion: Mapped[Decimal | None] = mapped_column(Numeric(12, 1))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    manager: Mapped["FundManager | None"] = relationship("FundManager", back_populates="etfs")
    snapshots: Mapped[list["HoldingsSnapshot"]] = relationship("HoldingsSnapshot", back_populates="etf")
    changes: Mapped[list["HoldingsChange"]] = relationship("HoldingsChange", back_populates="etf")


class HoldingsSnapshot(Base):
    __tablename__ = "holdings_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    etf_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("etfs.id"), nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    stock_ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    shares: Mapped[int] = mapped_column(BigInteger, nullable=False)
    weight_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    etf: Mapped["ETF"] = relationship("ETF", back_populates="snapshots")


class HoldingsChange(Base):
    __tablename__ = "holdings_changes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    etf_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("etfs.id"), nullable=False)
    change_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    stock_ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    change_type: Mapped[ChangeType] = mapped_column(Enum(ChangeType), nullable=False)
    shares_before: Mapped[int] = mapped_column(BigInteger, nullable=False)
    shares_after: Mapped[int] = mapped_column(BigInteger, nullable=False)
    shares_delta: Mapped[int] = mapped_column(BigInteger, nullable=False)
    amount_billion: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    etf: Mapped["ETF"] = relationship("ETF", back_populates="changes")


class Stock(Base):
    __tablename__ = "stocks"

    ticker: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    industry: Mapped[str | None] = mapped_column(String(50))
    sub_industry: Mapped[str | None] = mapped_column(String(50))
    founding_year: Mapped[int | None] = mapped_column(Integer)
    main_business: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel: Mapped[AlertChannel] = mapped_column(Enum(AlertChannel), nullable=False)
    contact: Mapped[str] = mapped_column(String(200), nullable=False)
    etf_code: Mapped[str | None] = mapped_column(String(10))
    threshold_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("1.0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
