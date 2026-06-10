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
