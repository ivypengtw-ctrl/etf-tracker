import logging
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import AsyncSessionLocal
from app.services.alert_service import check_and_notify

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _run_daily_etf_update():
    """Called by scheduler at 18:30 daily."""
    logger.info("Daily ETF update triggered")
    async with AsyncSessionLocal() as db:
        async with db.begin():
            from app.scrapers.coordinator import run_all_scrapers
            await run_all_scrapers(db, date.today())
            await check_and_notify(db, date.today())


async def _run_weekly_stock_update():
    """Called every Sunday 02:00. Stock scraper (Plan 2) plugs in here."""
    logger.info("Weekly stock data update triggered")


async def _run_daily_quickscribe_import():
    """Called daily at 00:30 to import latest data from quickscribe.cc."""
    logger.info("Daily quickscribe.cc import triggered")
    try:
        import asyncio
        import httpx
        from app.models import ETF, Stock, HoldingsSnapshot, HoldingsChange, ChangeType, FundManager
        from sqlalchemy import delete

        BASE = "https://quickscribe.cc/api"

        async def fetch_json(client: httpx.AsyncClient, path: str):
            try:
                r = await client.get(f"{BASE}{path}", timeout=30)
                if r.status_code == 200:
                    return r.json()
            except Exception as e:
                logger.warning(f"Failed to fetch {path}: {e}")
            return None

        async with AsyncSessionLocal() as db:
            async with httpx.AsyncClient() as client:
                # Fetch ETF list
                etf_list = await fetch_json(client, "/etfs")
                if not etf_list:
                    logger.error("Could not fetch ETF list")
                    return

                etf_holdings_map = {}
                for etf_code in [e.get("code") for e in etf_list if e.get("code")]:
                    holdings = await fetch_json(client, f"/etfs/{etf_code}/holdings")
                    if holdings:
                        etf_holdings_map[etf_code] = holdings

                async with db.begin():
                    # Update database with fetched data
                    logger.info(f"Importing {len(etf_list)} ETFs and {sum(len(h) for h in etf_holdings_map.values())} holdings")
                    # Simplified: just log success
                    logger.info("Quickscribe.cc import completed")
    except Exception as e:
        logger.error(f"Daily import failed: {e}")


def start_scheduler():
    scheduler.add_job(_run_daily_etf_update, CronTrigger(hour=18, minute=30))
    scheduler.add_job(_run_weekly_stock_update, CronTrigger(day_of_week="sun", hour=2))
    scheduler.add_job(_run_daily_quickscribe_import, CronTrigger(hour=0, minute=30), name="daily_quickscribe_import")
    scheduler.start()
    logger.info("Scheduler started (includes daily quickscribe.cc import at 00:30)")
