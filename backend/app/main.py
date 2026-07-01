from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import etfs, dashboard, managers, stocks, alerts, funds
from app.scheduler import start_scheduler


@asynccontextmanager
async def lifespan(app):
    start_scheduler()
    yield


app = FastAPI(title="ETF Tracker API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "https://your-vercel-domain.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(etfs.router)
app.include_router(dashboard.router)
app.include_router(managers.router)
app.include_router(stocks.router)
app.include_router(alerts.router)
app.include_router(funds.router)
