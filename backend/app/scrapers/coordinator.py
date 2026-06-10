import logging
from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ETF, HoldingsSnapshot
from app.scrapers.base import BaseScraper
from app.scrapers.yuanta import YuantaScraper
from app.scrapers.fubon import FubonScraper
from app.scrapers.cathay import CathayScraper
from app.scrapers.ctbc import CTBCScraper
from app.scrapers.capital import CapitalScraper
from app.scrapers.sinopac import SinopacScraper
from app.services.diff_engine import compute_daily_diff

logger = logging.getLogger(__name__)

COMPANY_SCRAPER_MAP = {
    "元大": YuantaScraper,
    "富邦": FubonScraper,
    "國泰": CathayScraper,
    "中信": CTBCScraper,
    "群益": CapitalScraper,
    "永豐": SinopacScraper,
}


async def run_etf_scraper_for(
    db: AsyncSession,
    etf: ETF,
    scraper: BaseScraper,
    target_date: date,
) -> None:
    try:
        holdings = scraper.scrape(etf.code)
    except Exception as exc:
        logger.error("Scraper failed for %s: %s", etf.code, exc)
        return

    await db.execute(
        delete(HoldingsSnapshot).where(
            HoldingsSnapshot.etf_id == etf.id,
            HoldingsSnapshot.snapshot_date == target_date,
        )
    )
    for row in holdings:
        db.add(HoldingsSnapshot(
            etf_id=etf.id,
            snapshot_date=target_date,
            stock_ticker=row.stock_ticker,
            shares=row.shares,
            weight_pct=row.weight_pct,
        ))
    await db.flush()

    changes = await compute_daily_diff(db, etf.id, target_date)
    for change in changes:
        db.add(change)
    await db.flush()
    logger.info("Scraped %s: %d holdings, %d changes", etf.code, len(holdings), len(changes))


async def run_all_scrapers(db: AsyncSession, target_date: date) -> None:
    etfs_result = await db.execute(select(ETF))
    etfs = etfs_result.scalars().all()

    for etf in etfs:
        scraper_cls = COMPANY_SCRAPER_MAP.get(etf.fund_company[:2])
        if not scraper_cls:
            logger.warning("No scraper for fund company: %s", etf.fund_company)
            continue
        scraper = scraper_cls()
        await run_etf_scraper_for(db, etf, scraper, target_date)
