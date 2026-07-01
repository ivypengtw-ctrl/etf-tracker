"""
Seed database with real data fetched from quickscribe.cc API.
Usage: python -m app.seed_from_api
"""
import asyncio
from datetime import date
from decimal import Decimal

import httpx
from sqlalchemy import delete

from app.database import AsyncSessionLocal
from app.models import (
    ETF, ETFType, FundManager, HoldingsChange, HoldingsSnapshot, ChangeType, Stock
)

BASE = "https://quickscribe.cc/api"

TYPE_MAP = {
    "主動式ETF": ETFType.active,
    "被動式ETF": ETFType.stock,
}

CHANGE_TYPE_MAP = {
    "new":       ChangeType.added,
    "increased": ChangeType.increased,
    "decreased": ChangeType.decreased,
    "removed":   ChangeType.removed,
}


async def fetch_json(client: httpx.AsyncClient, path: str):
    try:
        r = await client.get(f"{BASE}{path}", timeout=30)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"  WARNING: fetch {path} failed: {e}")
    return None


async def seed():
    async with httpx.AsyncClient() as client:
        print("Fetching ETF list...")
        etf_list = await fetch_json(client, "/etfs")
        if not etf_list:
            print("ERROR: could not fetch ETF list")
            return

        etf_holdings: dict[str, list] = {}
        etf_changes:  dict[str, list] = {}

        for etf in etf_list:
            code = etf["code"]
            print(f"  {code} holdings...", end=" ", flush=True)
            h = await fetch_json(client, f"/etfs/{code}/holdings")
            etf_holdings[code] = h if isinstance(h, list) else []
            print(f"{len(etf_holdings[code])} rows", end="  |  ", flush=True)

            print(f"changes...", end=" ", flush=True)
            c = await fetch_json(client, f"/etfs/{code}/changes")
            etf_changes[code] = c if isinstance(c, list) else []
            print(f"{len(etf_changes[code])} rows")

    # Build stock universe
    stock_map: dict[str, str] = {}  # ticker -> name
    for holdings in etf_holdings.values():
        for h in holdings:
            t = (h.get("stock_code") or "")[:10]
            n = h.get("stock_name") or t
            if t and t not in stock_map:
                stock_map[t] = n
    for changes in etf_changes.values():
        for c in changes:
            t = (c.get("stock_code") or "")[:10]
            n = c.get("stock_name") or t
            if t and t not in stock_map:
                stock_map[t] = n

    # Manager names
    manager_names: set[str] = set()
    for etf in etf_list:
        m = etf.get("fund_manager", "")
        if m:
            manager_names.add(m)

    print(f"\nStocks: {len(stock_map)}, Managers: {len(manager_names)}")
    print("Writing to database...")

    async with AsyncSessionLocal() as session:
        await session.execute(delete(HoldingsChange))
        await session.execute(delete(HoldingsSnapshot))
        await session.execute(delete(ETF))
        await session.execute(delete(FundManager))
        await session.execute(delete(Stock))
        await session.commit()

        # Stocks
        session.add_all([
            Stock(ticker=t, name=n[:100])
            for t, n in stock_map.items()
        ])
        await session.commit()
        print(f"  Stocks: {len(stock_map)}")

        # Managers
        mgr_objs = [FundManager(name=name) for name in manager_names]
        session.add_all(mgr_objs)
        await session.commit()
        mgr_map_obj = {m.name: m for m in mgr_objs}
        print(f"  Managers: {len(mgr_objs)}")

        # ETFs
        etf_objs = []
        for etf in etf_list:
            code = etf["code"]
            # market field determines type: 全球 = active, others default active for A-suffix
            etf_type = ETFType.active if code.endswith("A") else ETFType.stock
            mgr_name = etf.get("fund_manager", "")
            cap_raw = etf.get("total_market_value")
            cap = (Decimal(str(cap_raw)) / Decimal("1e8")).quantize(Decimal("0.1")) if cap_raw else None
            # No inception_date in this API — skip for now
            etf_objs.append(ETF(
                code=code,
                name=etf.get("name", code)[:100],
                type=etf_type,
                fund_company=(etf.get("manager_company") or "")[:50],
                manager_id=mgr_map_obj[mgr_name].id if mgr_name in mgr_map_obj else None,
                market_cap_billion=cap,
            ))
        session.add_all(etf_objs)
        await session.commit()
        code_to_etf = {e.code: e for e in etf_objs}
        print(f"  ETFs: {len(etf_objs)}")

        # Holdings snapshots
        all_snapshots = []
        for etf in etf_list:
            code = etf["code"]
            etf_id = code_to_etf[code].id
            for h in etf_holdings.get(code, []):
                ticker = (h.get("stock_code") or "")[:10]
                if not ticker:
                    continue
                try:
                    snap_date = date.fromisoformat(h["holding_date"])
                    shares = int(h.get("shares") or 0)
                    weight = Decimal(str(h.get("percentage") or 0))
                except Exception:
                    continue
                all_snapshots.append(HoldingsSnapshot(
                    etf_id=etf_id,
                    snapshot_date=snap_date,
                    stock_ticker=ticker,
                    shares=shares,
                    weight_pct=weight,
                ))
        session.add_all(all_snapshots)
        await session.commit()
        print(f"  Snapshots: {len(all_snapshots)}")

        # Changes
        all_changes = []
        for etf in etf_list:
            code = etf["code"]
            etf_id = code_to_etf[code].id
            snap_date_str = etf.get("total_market_value_date") or etf.get("change_summary_date")
            change_date = date.fromisoformat(snap_date_str) if snap_date_str else date.today()

            for c in etf_changes.get(code, []):
                ticker = (c.get("stock_code") or "")[:10]
                ctype = CHANGE_TYPE_MAP.get(c.get("change_type") or "")
                if not ticker or not ctype:
                    continue
                try:
                    before = int(c.get("old_shares") or 0)
                    after  = int(c.get("new_shares") or 0)
                    delta  = after - before
                except Exception:
                    continue
                all_changes.append(HoldingsChange(
                    etf_id=etf_id,
                    change_date=change_date,
                    stock_ticker=ticker,
                    change_type=ctype,
                    shares_before=before,
                    shares_after=after,
                    shares_delta=delta,
                ))
        session.add_all(all_changes)
        await session.commit()
        print(f"  Changes: {len(all_changes)}")

    print("\n[OK] Seed from quickscribe.cc complete!")


if __name__ == "__main__":
    asyncio.run(seed())
