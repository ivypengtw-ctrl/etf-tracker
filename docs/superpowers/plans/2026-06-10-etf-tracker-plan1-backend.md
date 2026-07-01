# Taiwan ETF Tracker — Plan 1: Backend Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete FastAPI backend — PostgreSQL models, diff engine, dashboard summary service, all REST API endpoints, alert service, and scheduler stub — producing a fully functional API server ready for scrapers (Plan 2) to populate.

**Architecture:** FastAPI with SQLAlchemy 2.0 (async), PostgreSQL via asyncpg. A diff engine computes `holdings_changes` by comparing consecutive daily snapshots. APScheduler triggers daily scraping and post-diff alert checks. All I/O uses async sessions. Tests use a real PostgreSQL test DB with per-test transaction rollback.

**Tech Stack:** Python 3.12, FastAPI 0.111, SQLAlchemy 2.0, asyncpg, Alembic 1.13, APScheduler 3.10, pytest + pytest-asyncio 0.23, httpx (test client)

---

## File Map

```
backend/
├── pyproject.toml
├── .env.example
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 001_initial_schema.py
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── services/
│   │   ├── diff_engine.py
│   │   ├── dashboard.py
│   │   ├── summary_text.py
│   │   └── alert_service.py
│   ├── routers/
│   │   ├── etfs.py
│   │   ├── dashboard.py
│   │   ├── managers.py
│   │   ├── stocks.py
│   │   └── alerts.py
│   └── scheduler.py
└── tests/
    ├── conftest.py
    ├── test_diff_engine.py
    ├── test_dashboard_service.py
    ├── test_summary_text.py
    ├── test_api_etfs.py
    ├── test_api_dashboard.py
    └── test_alert_service.py
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`

- [ ] **Step 1: Create the backend directory**

```bash
mkdir backend && cd backend
```

- [ ] **Step 2: Create `pyproject.toml`**

```toml
[project]
name = "etf-tracker-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi==0.111.0",
  "uvicorn[standard]==0.29.0",
  "sqlalchemy==2.0.30",
  "asyncpg==0.29.0",
  "alembic==1.13.1",
  "pydantic==2.7.1",
  "pydantic-settings==2.2.1",
  "apscheduler==3.10.4",
  "httpx==0.27.0",
  "beautifulsoup4==4.12.3",
  "requests==2.32.2",
]

[project.optional-dependencies]
dev = [
  "pytest==8.2.0",
  "pytest-asyncio==0.23.6",
  "pytest-mock==3.14.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker
TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker_test
LINE_NOTIFY_TOKEN=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

- [ ] **Step 4: Install dependencies**

```bash
pip install -e ".[dev]"
```

Expected: all packages installed without errors.

- [ ] **Step 5: Create local PostgreSQL databases**

```bash
createdb etf_tracker
createdb etf_tracker_test
```

- [ ] **Step 6: Commit**

```bash
git init
git add pyproject.toml .env.example
git commit -m "chore: project bootstrap"
```

---

## Task 2: Database Layer + Models

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models.py`
- Test: `backend/tests/conftest.py`

- [ ] **Step 1: Write `app/database.py`**

```python
import os
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 2: Write `app/models.py`**

```python
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
```

- [ ] **Step 3: Write `tests/conftest.py`**

```python
import asyncio
import os
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.database import Base
from app.models import ETF, FundManager, HoldingsSnapshot, HoldingsChange, Stock, AlertSubscription

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker_test",
)

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db(test_engine) -> AsyncSession:
    factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with factory() as session:
        async with session.begin():
            yield session
            await session.rollback()
```

- [ ] **Step 4: Write a smoke test to verify models import**

Create `tests/test_models_smoke.py`:

```python
from app.models import ETF, FundManager, HoldingsSnapshot, HoldingsChange, Stock, AlertSubscription

def test_models_importable():
    assert ETF.__tablename__ == "etfs"
    assert FundManager.__tablename__ == "fund_managers"
    assert HoldingsSnapshot.__tablename__ == "holdings_snapshots"
    assert HoldingsChange.__tablename__ == "holdings_changes"
    assert Stock.__tablename__ == "stocks"
    assert AlertSubscription.__tablename__ == "alert_subscriptions"
```

- [ ] **Step 5: Run and verify**

```bash
cd backend
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker \
pytest tests/test_models_smoke.py -v
```

Expected: `PASSED`

- [ ] **Step 6: Commit**

```bash
git add app/database.py app/models.py tests/conftest.py tests/test_models_smoke.py
git commit -m "feat: database layer and ORM models"
```

---

## Task 3: Alembic Migration

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/001_initial_schema.py`

- [ ] **Step 1: Initialize Alembic**

```bash
cd backend
alembic init alembic
```

- [ ] **Step 2: Replace `alembic/env.py`** with async-compatible version:

```python
import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context
from app.database import Base
import app.models  # noqa: F401 — registers all models

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = os.environ["DATABASE_URL"]
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    connectable = create_async_engine(os.environ["DATABASE_URL"], poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 3: Generate the initial migration**

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker \
alembic revision --autogenerate -m "initial_schema"
```

Expected: creates `alembic/versions/<hash>_initial_schema.py` with all 6 tables.

- [ ] **Step 4: Apply migration**

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker \
alembic upgrade head
```

Expected: `Running upgrade  -> <hash>, initial_schema`

- [ ] **Step 5: Commit**

```bash
git add alembic.ini alembic/
git commit -m "feat: initial database migration"
```

---

## Task 4: Holdings Diff Engine

**Files:**
- Create: `backend/app/services/diff_engine.py`
- Test: `backend/tests/test_diff_engine.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_diff_engine.py`:

```python
import uuid
from datetime import date
from decimal import Decimal

import pytest

from app.models import ETF, ETFType, HoldingsSnapshot, HoldingsChange, ChangeType
from app.services.diff_engine import compute_daily_diff


@pytest.fixture
async def etf(db):
    obj = ETF(code="00981A", name="Test ETF", type=ETFType.stock, fund_company="Test Co")
    db.add(obj)
    await db.flush()
    return obj


async def _add_snapshot(db, etf_id, snap_date, holdings: dict[str, int]):
    for ticker, shares in holdings.items():
        db.add(HoldingsSnapshot(
            etf_id=etf_id,
            snapshot_date=snap_date,
            stock_ticker=ticker,
            shares=shares,
            weight_pct=Decimal("1.00"),
        ))
    await db.flush()


async def test_new_stock_is_added(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 1000})
    await _add_snapshot(db, etf.id, today, {"2330": 1000, "2454": 500})

    changes = await compute_daily_diff(db, etf.id, today)

    assert len(changes) == 1
    assert changes[0].stock_ticker == "2454"
    assert changes[0].change_type == ChangeType.added
    assert changes[0].shares_before == 0
    assert changes[0].shares_after == 500


async def test_removed_stock(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 1000, "2454": 500})
    await _add_snapshot(db, etf.id, today, {"2330": 1000})

    changes = await compute_daily_diff(db, etf.id, today)

    assert len(changes) == 1
    assert changes[0].stock_ticker == "2454"
    assert changes[0].change_type == ChangeType.removed
    assert changes[0].shares_delta == -500


async def test_increased_shares(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 1000})
    await _add_snapshot(db, etf.id, today, {"2330": 1500})

    changes = await compute_daily_diff(db, etf.id, today)

    assert changes[0].change_type == ChangeType.increased
    assert changes[0].shares_delta == 500


async def test_no_change_produces_no_diff(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 1000})
    await _add_snapshot(db, etf.id, today, {"2330": 1000})

    changes = await compute_daily_diff(db, etf.id, today)

    assert changes == []


async def test_amount_billion_computed_when_price_provided(db, etf):
    today = date(2026, 6, 10)
    yesterday = date(2026, 6, 9)
    await _add_snapshot(db, etf.id, yesterday, {"2330": 0})
    await _add_snapshot(db, etf.id, today, {"2330": 1000})

    price_map = {"2330": Decimal("1000")}  # 1000 TWD/share
    changes = await compute_daily_diff(db, etf.id, today, price_map=price_map)

    # 1000 lots * 1000 price / 1e8 = 0.01 billion
    assert changes[0].amount_billion == Decimal("0.01")
```

- [ ] **Step 2: Run to confirm failure**

```bash
DATABASE_URL=... TEST_DATABASE_URL=... pytest tests/test_diff_engine.py -v
```

Expected: `ImportError: cannot import name 'compute_daily_diff'`

- [ ] **Step 3: Implement `app/services/diff_engine.py`**

```python
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HoldingsSnapshot, HoldingsChange, ChangeType


async def compute_daily_diff(
    db: AsyncSession,
    etf_id: UUID,
    target_date: date,
    price_map: dict[str, Decimal] | None = None,
) -> list[HoldingsChange]:
    yesterday = target_date - timedelta(days=1)
    today_rows = await _get_snapshot(db, etf_id, target_date)
    yesterday_rows = await _get_snapshot(db, etf_id, yesterday)

    today_map = {r.stock_ticker: r.shares for r in today_rows}
    yesterday_map = {r.stock_ticker: r.shares for r in yesterday_rows}

    changes: list[HoldingsChange] = []
    for ticker in set(today_map) | set(yesterday_map):
        t = today_map.get(ticker, 0)
        y = yesterday_map.get(ticker, 0)
        if t == y:
            continue

        if y == 0:
            ctype = ChangeType.added
        elif t == 0:
            ctype = ChangeType.removed
        elif t > y:
            ctype = ChangeType.increased
        else:
            ctype = ChangeType.decreased

        delta = t - y
        price = price_map.get(ticker) if price_map else None
        amount = (Decimal(delta) / 1000 * price / Decimal("1e8")).quantize(Decimal("0.01")) if price else None

        changes.append(HoldingsChange(
            etf_id=etf_id,
            change_date=target_date,
            stock_ticker=ticker,
            change_type=ctype,
            shares_before=y,
            shares_after=t,
            shares_delta=delta,
            amount_billion=amount,
        ))

    return changes


async def _get_snapshot(db: AsyncSession, etf_id: UUID, snap_date: date) -> list[HoldingsSnapshot]:
    result = await db.execute(
        select(HoldingsSnapshot).where(
            HoldingsSnapshot.etf_id == etf_id,
            HoldingsSnapshot.snapshot_date == snap_date,
        )
    )
    return list(result.scalars().all())
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
DATABASE_URL=... TEST_DATABASE_URL=... pytest tests/test_diff_engine.py -v
```

Expected: 5 PASSED

- [ ] **Step 5: Commit**

```bash
git add app/services/diff_engine.py tests/test_diff_engine.py
git commit -m "feat: holdings diff engine"
```

---

## Task 5: Dashboard Service

**Files:**
- Create: `backend/app/services/dashboard.py`
- Create: `backend/app/services/summary_text.py`
- Test: `backend/tests/test_dashboard_service.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_dashboard_service.py`:

```python
import uuid
from datetime import date
from decimal import Decimal

import pytest

from app.models import ETF, ETFType, HoldingsChange, ChangeType, Stock
from app.services.dashboard import get_summary_stats, get_cross_etf_rankings
from app.services.summary_text import generate_summary_text


@pytest.fixture
async def two_etfs(db):
    etf_a = ETF(id=uuid.uuid4(), code="00981A", name="ETF A", type=ETFType.stock, fund_company="Co A")
    etf_b = ETF(id=uuid.uuid4(), code="00878", name="ETF B", type=ETFType.stock, fund_company="Co B")
    db.add_all([etf_a, etf_b])
    await db.flush()
    return etf_a, etf_b


async def _add_change(db, etf_id, ticker, ctype, delta, amount):
    db.add(HoldingsChange(
        etf_id=etf_id,
        change_date=date(2026, 6, 10),
        stock_ticker=ticker,
        change_type=ctype,
        shares_before=0,
        shares_after=abs(delta),
        shares_delta=delta,
        amount_billion=Decimal(str(amount)),
    ))


async def test_total_buy_sell_aggregation(db, two_etfs):
    etf_a, etf_b = two_etfs
    target_date = date(2026, 6, 10)
    await _add_change(db, etf_a.id, "2454", ChangeType.added, 1000, "22.8")
    await _add_change(db, etf_b.id, "2330", ChangeType.increased, 500, "8.4")
    await _add_change(db, etf_a.id, "2382", ChangeType.removed, -800, "-19.1")
    await db.flush()

    stats = await get_summary_stats(db, target_date)

    assert stats["total_buy_billion"] == Decimal("31.2")
    assert stats["total_sell_billion"] == Decimal("-19.1")
    assert stats["etf_count_buy"] == 2
    assert stats["etf_count_sell"] == 1


async def test_cross_etf_buys(db, two_etfs):
    etf_a, etf_b = two_etfs
    target_date = date(2026, 6, 10)
    # Both ETFs buy 2454
    await _add_change(db, etf_a.id, "2454", ChangeType.added, 1000, "13.0")
    await _add_change(db, etf_b.id, "2454", ChangeType.increased, 500, "7.0")
    await db.flush()

    rankings = await get_cross_etf_rankings(db, target_date, direction="buy", top_n=3)

    assert rankings[0]["ticker"] == "2454"
    assert rankings[0]["etf_count"] == 2
    assert rankings[0]["total_amount_billion"] == Decimal("20.0")


def test_summary_text_format():
    text = generate_summary_text(
        total_buy=Decimal("79.4"),
        total_sell=Decimal("-35.9"),
        top_industry="半導體業",
        top_industry_amount=Decimal("36.2"),
        top_etf_code="00981A",
        top_etf_name="主動統一台股增長",
        top_etf_amount=Decimal("22.8"),
    )
    assert "79.4 億" in text
    assert "35.9 億" in text
    assert "00981A" in text
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_dashboard_service.py -v
```

Expected: `ImportError: cannot import name 'get_summary_stats'`

- [ ] **Step 3: Implement `app/services/summary_text.py`**

```python
from decimal import Decimal


def generate_summary_text(
    total_buy: Decimal,
    total_sell: Decimal,
    top_industry: str,
    top_industry_amount: Decimal,
    top_etf_code: str,
    top_etf_name: str,
    top_etf_amount: Decimal,
) -> str:
    return (
        f"今日主動圈 加碼 +{total_buy:.1f} 億、減碼 -{abs(total_sell):.1f} 億，"
        f"{top_industry}加碼最多（+{top_industry_amount:.1f} 億），"
        f"{top_etf_code} {top_etf_name}領頭（+{top_etf_amount:.1f} 億）。"
    )
```

- [ ] **Step 4: Implement `app/services/dashboard.py`**

```python
from datetime import date
from decimal import Decimal

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HoldingsChange, ChangeType, ETF


async def get_summary_stats(db: AsyncSession, target_date: date) -> dict:
    result = await db.execute(
        select(
            func.sum(HoldingsChange.amount_billion).filter(HoldingsChange.shares_delta > 0).label("total_buy"),
            func.sum(HoldingsChange.amount_billion).filter(HoldingsChange.shares_delta < 0).label("total_sell"),
        ).where(HoldingsChange.change_date == target_date)
    )
    row = result.one()

    buy_etfs = await db.execute(
        select(func.count(HoldingsChange.etf_id.distinct())).where(
            HoldingsChange.change_date == target_date,
            HoldingsChange.shares_delta > 0,
        )
    )
    sell_etfs = await db.execute(
        select(func.count(HoldingsChange.etf_id.distinct())).where(
            HoldingsChange.change_date == target_date,
            HoldingsChange.shares_delta < 0,
        )
    )

    return {
        "total_buy_billion": row.total_buy or Decimal("0"),
        "total_sell_billion": row.total_sell or Decimal("0"),
        "etf_count_buy": buy_etfs.scalar() or 0,
        "etf_count_sell": sell_etfs.scalar() or 0,
    }


async def get_cross_etf_rankings(
    db: AsyncSession,
    target_date: date,
    direction: str,  # "buy" or "sell"
    top_n: int = 3,
) -> list[dict]:
    condition = HoldingsChange.shares_delta > 0 if direction == "buy" else HoldingsChange.shares_delta < 0

    result = await db.execute(
        select(
            HoldingsChange.stock_ticker,
            func.count(HoldingsChange.etf_id.distinct()).label("etf_count"),
            func.sum(HoldingsChange.amount_billion).label("total_amount"),
        )
        .where(HoldingsChange.change_date == target_date, condition)
        .group_by(HoldingsChange.stock_ticker)
        .order_by(func.sum(HoldingsChange.amount_billion).desc() if direction == "buy"
                  else func.sum(HoldingsChange.amount_billion).asc())
        .limit(top_n)
    )

    return [
        {"ticker": r.stock_ticker, "etf_count": r.etf_count, "total_amount_billion": r.total_amount}
        for r in result.all()
    ]


async def get_top_etfs(
    db: AsyncSession,
    target_date: date,
    direction: str,
    top_n: int = 3,
) -> list[dict]:
    condition = HoldingsChange.shares_delta > 0 if direction == "buy" else HoldingsChange.shares_delta < 0

    result = await db.execute(
        select(
            HoldingsChange.etf_id,
            ETF.code,
            ETF.name,
            func.sum(HoldingsChange.amount_billion).label("total_amount"),
        )
        .join(ETF, ETF.id == HoldingsChange.etf_id)
        .where(HoldingsChange.change_date == target_date, condition)
        .group_by(HoldingsChange.etf_id, ETF.code, ETF.name)
        .order_by(func.sum(HoldingsChange.amount_billion).desc() if direction == "buy"
                  else func.sum(HoldingsChange.amount_billion).asc())
        .limit(top_n)
    )

    return [
        {"etf_code": r.code, "etf_name": r.name, "total_amount_billion": r.total_amount}
        for r in result.all()
    ]
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_dashboard_service.py -v
```

Expected: 3 PASSED

- [ ] **Step 6: Commit**

```bash
git add app/services/dashboard.py app/services/summary_text.py tests/test_dashboard_service.py
git commit -m "feat: dashboard summary service and summary text generator"
```

---

## Task 6: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas.py`

No tests needed — schemas are validated by FastAPI at runtime. We verify them in route tests (Tasks 7–9).

- [ ] **Step 1: Write `app/schemas.py`**

```python
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


class ETFOut(BaseModel):
    id: UUID
    code: str
    name: str
    type: str
    fund_company: str
    inception_date: Optional[date] = None
    manager: Optional[FundManagerOut] = None
    model_config = {"from_attributes": True}


class HoldingsChangeOut(BaseModel):
    stock_ticker: str
    change_type: str
    shares_before: int
    shares_after: int
    shares_delta: int
    amount_billion: Optional[Decimal] = None
    model_config = {"from_attributes": True}


class ETFChangesOut(BaseModel):
    etf: ETFOut
    change_date: date
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
```

- [ ] **Step 2: Commit**

```bash
git add app/schemas.py
git commit -m "feat: pydantic response schemas"
```

---

## Task 7: ETF API Routes

**Files:**
- Create: `backend/app/routers/etfs.py`
- Create: `backend/app/main.py`
- Test: `backend/tests/test_api_etfs.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_api_etfs.py`:

```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_api_etfs.py -v
```

Expected: `ImportError: cannot import name 'app' from 'app.main'`

- [ ] **Step 3: Write `app/routers/etfs.py`**

```python
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import ETF, HoldingsChange
from app.schemas import ETFOut, ETFChangesOut, HoldingsChangeOut

router = APIRouter(prefix="/etfs", tags=["etfs"])


@router.get("", response_model=list[ETFOut])
async def list_etfs(
    search: str | None = Query(None),
    type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(ETF).options(selectinload(ETF.manager))
    if search:
        q = q.where(ETF.name.ilike(f"%{search}%") | ETF.code.ilike(f"%{search}%"))
    if type:
        q = q.where(ETF.type == type)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/top-movers", response_model=list[dict])
async def top_movers(
    target_date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
):
    from app.services.dashboard import get_top_etfs
    buy = await get_top_etfs(db, target_date, "buy", top_n=4)
    sell = await get_top_etfs(db, target_date, "sell", top_n=4)
    return {"buy": buy, "sell": sell}


@router.get("/{code}", response_model=ETFOut)
async def get_etf(code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ETF).options(selectinload(ETF.manager)).where(ETF.code == code)
    )
    etf = result.scalar_one_or_none()
    if not etf:
        raise HTTPException(status_code=404, detail="ETF not found")
    return etf


@router.get("/{code}/changes", response_model=ETFChangesOut)
async def get_etf_changes(
    code: str,
    date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ETF).options(selectinload(ETF.manager)).where(ETF.code == code)
    )
    etf = result.scalar_one_or_none()
    if not etf:
        raise HTTPException(status_code=404, detail="ETF not found")

    changes_result = await db.execute(
        select(HoldingsChange).where(
            HoldingsChange.etf_id == etf.id,
            HoldingsChange.change_date == date,
        )
    )
    changes = changes_result.scalars().all()
    return ETFChangesOut(etf=etf, change_date=date, changes=changes)
```

- [ ] **Step 4: Write `app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import etfs, dashboard, managers, stocks, alerts

app = FastAPI(title="ETF Tracker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-vercel-domain.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(etfs.router)
app.include_router(dashboard.router)
app.include_router(managers.router)
app.include_router(stocks.router)
app.include_router(alerts.router)
```

Also create empty stub files so the import works:
- `app/routers/__init__.py` (empty)
- `app/routers/dashboard.py` — stub: `from fastapi import APIRouter; router = APIRouter()`
- `app/routers/managers.py` — stub
- `app/routers/stocks.py` — stub
- `app/routers/alerts.py` — stub

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_api_etfs.py -v
```

Expected: 5 PASSED

- [ ] **Step 6: Commit**

```bash
git add app/main.py app/routers/ tests/test_api_etfs.py
git commit -m "feat: ETF API routes"
```

---

## Task 8: Dashboard API Route

**Files:**
- Modify: `backend/app/routers/dashboard.py`
- Test: `backend/tests/test_api_dashboard.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_api_dashboard.py`:

```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_api_dashboard.py -v
```

Expected: 404 or import error from stub router.

- [ ] **Step 3: Implement `app/routers/dashboard.py`**

```python
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ETF, HoldingsChange
from app.schemas import DashboardSummary, CrossETFItem, TopETFItem
from app.services.dashboard import get_summary_stats, get_cross_etf_rankings, get_top_etfs
from app.services.summary_text import generate_summary_text

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(
    date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
):
    stats = await get_summary_stats(db, date)
    cross_buys = await get_cross_etf_rankings(db, date, "buy")
    cross_sells = await get_cross_etf_rankings(db, date, "sell")
    top_buy = await get_top_etfs(db, date, "buy")
    top_sell = await get_top_etfs(db, date, "sell")

    total_etf_count_result = await db.execute(select(func.count(ETF.id)))
    total_etf_count = total_etf_count_result.scalar() or 0

    updated_count_result = await db.execute(
        select(func.count(HoldingsChange.etf_id.distinct())).where(
            HoldingsChange.change_date == date
        )
    )
    updated_count = updated_count_result.scalar() or 0

    top_etf = top_buy[0] if top_buy else None
    top_industry = cross_buys[0]["ticker"] if cross_buys else "N/A"
    summary_text = generate_summary_text(
        total_buy=stats["total_buy_billion"],
        total_sell=stats["total_sell_billion"],
        top_industry=top_industry,
        top_industry_amount=cross_buys[0]["total_amount_billion"] if cross_buys else 0,
        top_etf_code=top_etf["etf_code"] if top_etf else "N/A",
        top_etf_name=top_etf["etf_name"] if top_etf else "",
        top_etf_amount=top_etf["total_amount_billion"] if top_etf else 0,
    )

    return {
        "date": date,
        "total_buy_billion": stats["total_buy_billion"],
        "total_sell_billion": stats["total_sell_billion"],
        "etf_count_buy": stats["etf_count_buy"],
        "etf_count_sell": stats["etf_count_sell"],
        "updated_count": updated_count,
        "total_etf_count": total_etf_count,
        "summary_text": summary_text,
        "top_cross_buys": cross_buys,
        "top_cross_sells": cross_sells,
        "top_etfs_buy": top_buy,
        "top_etfs_sell": top_sell,
    }


@router.get("/cross-etf")
async def cross_etf(
    date: date = Query(default_factory=date.today),
    direction: str = Query(default="buy"),
    top_n: int = Query(default=3),
    db: AsyncSession = Depends(get_db),
):
    return await get_cross_etf_rankings(db, date, direction, top_n)
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_api_dashboard.py -v
```

Expected: 2 PASSED

- [ ] **Step 5: Commit**

```bash
git add app/routers/dashboard.py tests/test_api_dashboard.py
git commit -m "feat: dashboard API routes"
```

---

## Task 9: Manager, Stock & Alert Routes

**Files:**
- Modify: `backend/app/routers/managers.py`
- Modify: `backend/app/routers/stocks.py`
- Modify: `backend/app/routers/alerts.py`

- [ ] **Step 1: Implement `app/routers/managers.py`**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import FundManager
from app.schemas import FundManagerOut

router = APIRouter(prefix="/managers", tags=["managers"])


@router.get("/{manager_id}", response_model=FundManagerOut)
async def get_manager(manager_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FundManager).where(FundManager.id == manager_id))
    manager = result.scalar_one_or_none()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    return manager
```

- [ ] **Step 2: Implement `app/routers/stocks.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Stock, HoldingsSnapshot, ETF
from app.schemas import StockOut

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/{ticker}", response_model=StockOut)
async def get_stock(ticker: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stock).where(Stock.ticker == ticker))
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    # Find ETFs currently holding this stock (latest snapshot date)
    holders_result = await db.execute(
        select(ETF.code, ETF.name, HoldingsSnapshot.weight_pct)
        .join(HoldingsSnapshot, HoldingsSnapshot.etf_id == ETF.id)
        .where(HoldingsSnapshot.stock_ticker == ticker)
        .order_by(HoldingsSnapshot.snapshot_date.desc())
        .limit(50)
    )
    held_by = [
        {"etf_code": r.code, "etf_name": r.name, "weight_pct": float(r.weight_pct)}
        for r in holders_result.all()
    ]

    return StockOut(
        ticker=stock.ticker,
        name=stock.name,
        industry=stock.industry,
        sub_industry=stock.sub_industry,
        founding_year=stock.founding_year,
        main_business=stock.main_business,
        held_by=held_by,
    )
```

- [ ] **Step 3: Implement `app/routers/alerts.py`**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AlertSubscription, AlertChannel
from app.schemas import AlertCreate, AlertOut

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("", response_model=AlertOut, status_code=201)
async def create_alert(payload: AlertCreate, db: AsyncSession = Depends(get_db)):
    if payload.channel not in ("email", "line"):
        raise HTTPException(status_code=422, detail="channel must be 'email' or 'line'")
    sub = AlertSubscription(
        channel=AlertChannel[payload.channel],
        contact=payload.contact,
        etf_code=payload.etf_code,
        threshold_pct=payload.threshold_pct,
    )
    db.add(sub)
    await db.flush()
    return sub


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertSubscription).where(AlertSubscription.id == alert_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(sub)
```

- [ ] **Step 4: Write and run quick smoke tests**

Create `tests/test_api_misc.py`:

```python
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
```

```bash
pytest tests/test_api_misc.py -v
```

Expected: 3 PASSED

- [ ] **Step 5: Commit**

```bash
git add app/routers/managers.py app/routers/stocks.py app/routers/alerts.py tests/test_api_misc.py
git commit -m "feat: manager, stock, and alert API routes"
```

---

## Task 10: Alert Service

**Files:**
- Create: `backend/app/services/alert_service.py`
- Test: `backend/tests/test_alert_service.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_alert_service.py`:

```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_alert_service.py -v
```

Expected: `ImportError: cannot import name 'check_and_notify'`

- [ ] **Step 3: Implement `app/services/alert_service.py`**

```python
import os
import smtplib
from datetime import date
from decimal import Decimal
from email.mime.text import MIMEText

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AlertSubscription, HoldingsChange, ETF


async def check_and_notify(db: AsyncSession, target_date: date) -> None:
    subs_result = await db.execute(select(AlertSubscription))
    subscriptions = subs_result.scalars().all()

    for sub in subscriptions:
        changes = await _get_relevant_changes(db, sub, target_date)
        if not changes:
            continue

        total_amount = sum(abs(c.amount_billion or Decimal("0")) for c in changes)
        if total_amount < sub.threshold_pct:
            continue

        etf_result = await db.execute(
            select(ETF).where(ETF.code == sub.etf_code) if sub.etf_code
            else select(ETF).where(ETF.id == changes[0].etf_id)
        )
        etf = etf_result.scalar_one_or_none()
        subject = f"ETF 異動警報：{etf.code if etf else ''} 今日加減碼 {total_amount:.1f} 億"
        body = _format_alert_body(etf, changes)

        if sub.channel.value == "email":
            await _send_email(sub.contact, subject, body)
        else:
            await _send_line(sub.contact, f"{subject}\n{body}")


async def _get_relevant_changes(db, sub, target_date):
    q = select(HoldingsChange).where(HoldingsChange.change_date == target_date)
    if sub.etf_code:
        etf_result = await db.execute(select(ETF).where(ETF.code == sub.etf_code))
        etf = etf_result.scalar_one_or_none()
        if etf:
            q = q.where(HoldingsChange.etf_id == etf.id)
    result = await db.execute(q)
    return result.scalars().all()


def _format_alert_body(etf, changes) -> str:
    lines = [f"{etf.name if etf else '未知 ETF'} 今日異動："]
    for c in changes[:10]:
        sign = "+" if c.shares_delta > 0 else ""
        lines.append(f"  {c.stock_ticker}: {sign}{c.shares_delta} 張 ({sign}{c.amount_billion or 0:.2f} 億)")
    return "\n".join(lines)


async def _send_email(to: str, subject: str, body: str) -> None:
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = os.environ.get("SMTP_USER", "")
    msg["To"] = to
    with smtplib.SMTP(os.environ.get("SMTP_HOST", "localhost"), int(os.environ.get("SMTP_PORT", "25"))) as smtp:
        smtp.send_message(msg)


async def _send_line(token: str, message: str) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://notify-api.line.me/api/notify",
            headers={"Authorization": f"Bearer {token}"},
            data={"message": message},
        )
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_alert_service.py -v
```

Expected: 2 PASSED

- [ ] **Step 5: Commit**

```bash
git add app/services/alert_service.py tests/test_alert_service.py
git commit -m "feat: alert service with email and LINE Notify"
```

---

## Task 11: Scheduler Stub

**Files:**
- Create: `backend/app/scheduler.py`

- [ ] **Step 1: Write `app/scheduler.py`**

```python
import logging
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import AsyncSessionLocal
from app.services.alert_service import check_and_notify

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _run_daily_etf_update():
    """Called by scheduler at 18:30 daily. Scrapers (Plan 2) plug in here."""
    logger.info("Daily ETF update triggered (scrapers not yet implemented)")
    # Plan 2 will replace this with actual scraper calls:
    # await run_all_scrapers()
    # await compute_all_diffs()
    async with AsyncSessionLocal() as db:
        async with db.begin():
            await check_and_notify(db, date.today())


async def _run_weekly_stock_update():
    """Called every Sunday 02:00. Stock scraper (Plan 2) plugs in here."""
    logger.info("Weekly stock data update triggered")


def start_scheduler():
    scheduler.add_job(_run_daily_etf_update, CronTrigger(hour=18, minute=30))
    scheduler.add_job(_run_weekly_stock_update, CronTrigger(day_of_week="sun", hour=2))
    scheduler.start()
    logger.info("Scheduler started")
```

- [ ] **Step 2: Wire scheduler into `app/main.py`**

Add to `app/main.py`:

```python
from contextlib import asynccontextmanager
from app.scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app):
    start_scheduler()
    yield

app = FastAPI(title="ETF Tracker API", version="0.1.0", lifespan=lifespan)
```

- [ ] **Step 3: Start the server and confirm no errors**

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker \
uvicorn app.main:app --reload
```

Expected: server starts, logs `Scheduler started`, no errors. Visit `http://localhost:8000/docs`.

- [ ] **Step 4: Commit**

```bash
git add app/scheduler.py app/main.py
git commit -m "feat: APScheduler stub wired into FastAPI lifespan"
```

---

## Task 12: Full Test Suite + Render Deploy Config

**Files:**
- Create: `backend/render.yaml` (optional — or use Render dashboard)
- Create: `backend/Procfile`

- [ ] **Step 1: Run full test suite**

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker \
TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/etf_tracker_test \
pytest tests/ -v --tb=short
```

Expected: all tests PASSED (no failures).

- [ ] **Step 2: Create `Procfile`**

```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

- [ ] **Step 3: Final commit**

```bash
git add Procfile
git commit -m "chore: add Procfile for Render deployment"
```

---

*Plan 2 (Scrapers) and Plan 3 (Frontend) continue from here.*
