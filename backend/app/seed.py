import asyncio
from datetime import date

from app.database import AsyncSessionLocal
from app.models import ETF, ETFType
from app.scrapers.coordinator import run_all_scrapers


async def main():
    async with AsyncSessionLocal() as db:
        async with db.begin():
            # Seed a few well-known ETFs for testing
            etfs = [
                ETF(code="0050", name="元大台灣50", type=ETFType.stock, fund_company="元大"),
                ETF(code="0056", name="元大高股息", type=ETFType.stock, fund_company="元大"),
                ETF(code="00878", name="國泰永續高股息", type=ETFType.stock, fund_company="國泰"),
                ETF(code="00919", name="群益台灣精選高息", type=ETFType.stock, fund_company="群益"),
            ]
            for etf in etfs:
                db.add(etf)

    async with AsyncSessionLocal() as db:
        async with db.begin():
            await run_all_scrapers(db, date.today())


if __name__ == "__main__":
    asyncio.run(main())
