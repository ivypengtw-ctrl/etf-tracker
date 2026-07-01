"""Static seed for local development — 26 real active/passive ETFs."""
import asyncio
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import delete
from app.database import AsyncSessionLocal
from app.models import ETF, ETFType, FundManager, HoldingsChange, HoldingsSnapshot, ChangeType, Stock

TODAY = date.today()
D1 = TODAY - timedelta(days=1)
D2 = TODAY - timedelta(days=2)
D4 = TODAY - timedelta(days=4)
D8 = TODAY - timedelta(days=8)
D_FEB = date(2026, 2, 24)
D_MAR = date(2026, 3, 5)

# ── Stock universe ─────────────────────────────────────────────────────────────

TW_STOCKS = [
    ("2330",  "台積電",          "半導體",    "晶圓代工"),
    ("2454",  "聯發科",          "半導體",    "IC設計"),
    ("2382",  "廣達",            "電腦及周邊","伺服器"),
    ("3711",  "日月光投控",      "半導體",    "封裝測試"),
    ("2308",  "台達電",          "電子零組件","電源供應"),
    ("2317",  "鴻海",            "電腦及周邊","電子代工"),
    ("2379",  "瑞昱",            "半導體",    "IC設計"),
    ("4938",  "和碩",            "電腦及周邊","電子代工"),
    ("2303",  "聯電",            "半導體",    "晶圓代工"),
    ("3034",  "聯詠",            "半導體",    "IC設計"),
    ("2002",  "中鋼",            "鋼鐵",      "鋼鐵製造"),
    ("1301",  "台塑",            "塑膠",      "石化"),
    ("2882",  "國泰金",          "金融",      "壽險"),
    ("2412",  "中華電",          "通訊",      "電信"),
    ("2881",  "富邦金",          "金融",      "壽險"),
    ("1326",  "台化",            "塑膠",      "石化"),
    ("6669",  "緯穎",            "電腦及周邊","AI伺服器"),
    ("3661",  "世芯-KY",         "半導體",    "ASIC設計"),
    ("2357",  "華碩",            "電腦及周邊","筆電品牌"),
    ("2395",  "研華",            "電腦及周邊","工業電腦"),
]

US_STOCKS = [
    ("NVDA",   "NVIDIA Corp",         "半導體",    "GPU/AI晶片"),
    ("AAPL",   "Apple Inc",           "科技",      "消費電子"),
    ("MSFT",   "Microsoft Corp",      "科技",      "軟體/雲端"),
    ("META",   "Meta Platforms",      "科技",      "社群媒體"),
    ("GOOGL",  "Alphabet Inc",        "科技",      "搜尋/廣告"),
    ("AMZN",   "Amazon.com Inc",      "科技",      "電商/雲端"),
    ("AVGO",   "Broadcom Inc",        "半導體",    "網路晶片"),
    ("TSM",    "TSMC ADR",            "半導體",    "晶圓代工"),
    ("AMAT",   "Applied Materials",   "半導體",    "設備"),
    ("LRCX",   "Lam Research",        "半導體",    "設備"),
]

JP_STOCKS = [
    ("8035JP", "Tokyo Electron",      "半導體",    "設備"),
    ("6920JP", "Lasertec Corp",       "半導體",    "設備"),
    ("6981JP", "Murata Mfg",          "電子零組件","被動元件"),
    ("6976JP", "Taiyo Yuden",         "電子零組件","被動元件"),
    ("6787JP", "Meiko Electronics",   "電子零組件","PCB"),
    ("4062JP", "Ibiden Co",           "半導體",    "封裝基板"),
]

KR_STOCKS = [
    ("000660KS","SK Hynix",           "半導體",    "記憶體"),
    ("009150KS","Samsung Electro-Mec","電子零組件","MLCC"),
]

ALL_STOCKS = TW_STOCKS + US_STOCKS + JP_STOCKS + KR_STOCKS

# ── Per-ETF holdings profiles ──────────────────────────────────────────────────
# (stock_ticker, shares, weight_pct)

def _tw_holdings(tickers=None):
    """Standard Taiwan-only holdings, descending weight."""
    pool = tickers or [s[0] for s in TW_STOCKS]
    result = []
    n = len(pool)
    for i, t in enumerate(pool):
        w = round(15.0 - 13.0 * i / max(n - 1, 1), 2)
        s = max(500_000 - i * 20_000, 50_000)
        result.append((t, s, Decimal(str(w))))
    return result


def _global_holdings(us_tickers, jp_tickers, kr_tickers=None, tw_tickers=None):
    """Mix of US + JP + KR + TW stocks for global ETFs."""
    result = []
    # US — higher weight
    for i, t in enumerate(us_tickers):
        w = round(9.5 - 0.6 * i, 2)
        result.append((t, max(200_000 - i * 10_000, 50_000), Decimal(str(w))))
    # JP
    for i, t in enumerate(jp_tickers):
        w = round(4.0 - 0.3 * i, 2)
        result.append((t, max(120_000 - i * 8_000, 30_000), Decimal(str(w))))
    # KR
    for i, t in enumerate(kr_tickers or []):
        w = round(2.5 - 0.3 * i, 2)
        result.append((t, max(80_000 - i * 5_000, 20_000), Decimal(str(w))))
    # TW
    for i, t in enumerate(tw_tickers or []):
        w = round(2.0 - 0.1 * i, 2)
        result.append((t, max(60_000 - i * 3_000, 15_000), Decimal(str(w))))
    return result


# Map: ETF code → list of (ticker, shares, weight_pct)
HOLDINGS_BY_ETF: dict[str, list] = {
    # 全球創新 — US 科技重倉 + JP電子 + KR半導體 + 少量台股
    "00988A": _global_holdings(
        us_tickers=["NVDA","AAPL","MSFT","META","GOOGL","AMZN","AVGO","AMAT","LRCX"],
        jp_tickers=["8035JP","6920JP","6981JP","6976JP","6787JP","4062JP"],
        kr_tickers=["009150KS","000660KS"],
        tw_tickers=["2330","2454","3661","6669","2382"],
    ),
    # 全球AI新經濟 — 側重AI/半導體
    "00990A": _global_holdings(
        us_tickers=["NVDA","MSFT","GOOGL","AVGO","AMAT","LRCX","TSM","AAPL"],
        jp_tickers=["8035JP","6920JP","6981JP","4062JP"],
        kr_tickers=["000660KS"],
        tw_tickers=["2330","2454","3711","3661"],
    ),
    # 美國增長 — 幾乎全US
    "00997A": _global_holdings(
        us_tickers=["AAPL","MSFT","NVDA","GOOGL","META","AMZN","AVGO","TSM","AMAT","LRCX"],
        jp_tickers=["8035JP","6920JP"],
        tw_tickers=["2330","TSM"],
    ),
    # 摩根美國科技 — 純US科技
    "00989A": _global_holdings(
        us_tickers=["AAPL","MSFT","NVDA","META","GOOGL","AMZN","AVGO","AMAT","LRCX","TSM"],
        jp_tickers=["8035JP"],
        tw_tickers=["2330","2454"],
    ),
    # ARK創新 — 成長/破壞式創新
    "00983A": _global_holdings(
        us_tickers=["NVDA","MSFT","META","GOOGL","AMZN","AAPL","AVGO","TSM"],
        jp_tickers=["6920JP","8035JP","4062JP"],
        tw_tickers=["3661","6669","2330"],
    ),
    # 台新全球龍頭成長 — 全球龍頭均衡
    "00986A": _global_holdings(
        us_tickers=["AAPL","MSFT","NVDA","GOOGL","META","AMZN","AVGO","TSM"],
        jp_tickers=["8035JP","6920JP","6981JP"],
        kr_tickers=["000660KS"],
        tw_tickers=["2330","2454","2382"],
    ),
}

# All other ETFs use Taiwan stocks only (default)

# ── Change tickers ─────────────────────────────────────────────────────────────
COMMON_BUYS  = ["2330","2454","2382","3711","2308","2317","2379","4938","2303","3034"]
COMMON_SELLS = ["2002","1301","2882","2412","2881","1326"]

MANAGERS_DATA = [
    {"name":"陳釧瑤", "bio":"統一投信主動型台股成長策略基金經理人。"},
    {"name":"陳意婷", "bio":"主動全球科技及創新股票基金操盤人。"},
    {"name":"張哲瑋", "bio":"主動統一升級50基金經理人，台股中大型股票專家。"},
    {"name":"呂宏宇", "bio":"復華未來50主動基金操盤人，成長股選股策略。"},
    {"name":"陳沅易", "bio":"群益台灣強棒基金經理人，深耕台灣市場逾十年。"},
    {"name":"陳朝政", "bio":"群益科技創新基金操盤人，專注科技成長族群。"},
    {"name":"游景德", "bio":"野村臺灣優選主動基金經理人，量化與基本面並重。"},
    {"name":"林浩詳", "bio":"野村臺灣增強50主動ETF操盤人，指數增強策略。"},
    {"name":"林良一", "bio":"安聯台灣高息主動基金，高股息選股策略專家。"},
    {"name":"張書廷", "bio":"中信台灣卓越主動基金，消費與科技成長股專家。"},
    {"name":"張正中", "bio":"第一金台股優主動基金，價值成長並重操作策略。"},
]

# (code, name, type, company, manager_name_or_None, add_n, sell_n, market_cap_億, change_date)
ETF_DATA = [
    ("00981A","統一台灣高息優選基金（主動統一台股增長）", ETFType.active,"統一投信",    "陳釧瑤",  3,  3,Decimal("2900.2"),D1),
    ("00988A","主動統一全球創新",                        ETFType.active,"統一投信",    "陳意婷",  4,  1,Decimal("2586.7"),D1),
    ("00403A","主動統一升級50",                          ETFType.active,"統一投信",    "張哲瑋",  3,  5,Decimal("1669.3"),D1),
    ("00990A","主動元大全球AI新經濟",                    ETFType.active,"元大投信",    None,      1,  0,Decimal("1119.2"),D2),
    ("00991A","主動復華未來50",                          ETFType.active,"復華投信",    "呂宏宇",  2,  0,Decimal("662.1"), D1),
    ("00982A","主動群益台灣強棒",                        ETFType.active,"群益投信",    "陳沅易",  2,  1,Decimal("528.2"), D1),
    ("00992A","主動群益科技創新",                        ETFType.active,"群益投信",    "陳朝政",  2,  0,Decimal("445.1"), D1),
    ("00400A","國泰台股動能高息主動式ETF基金",           ETFType.active,"國泰投信",    None,      5,  1,Decimal("228.0"), D1),
    ("00980A","主動野村臺灣優選",                        ETFType.active,"野村投信",    "游景德",  6, 16,Decimal("157.0"), D1),
    ("00999A","主動野村臺灣高息",                        ETFType.active,"野村投信",    None,     12, 17,Decimal("135.7"), D1),
    ("00993A","主動安聯台灣高息成長",                    ETFType.active,"安聯投信",    None,     25, 17,Decimal("110.5"), D2),
    ("00985A","野村臺灣增強50主動式ETF",                 ETFType.active,"野村投信",    "林浩詳",  0, 27,Decimal("100.0"), D2),
    ("00984A","主動安聯台灣高息",                        ETFType.active,"安聯投信",    "林良一", 85,  0,Decimal("79.2"),  D1),
    ("00995A","主動中信台灣卓越",                        ETFType.active,"中國信託投信","張書廷",  2,  3,Decimal("54.5"),  D1),
    ("00994A","主動第一金台股優",                        ETFType.active,"第一金投信",  "張正中",  5,  3,Decimal("53.1"),  D1),
    ("00996A","主動兆豐台灣豐收",                        ETFType.active,"兆豐投信",    None,      1,  1,Decimal("49.6"),  D1),
    ("00401A","主動摩根台灣鑫收",                        ETFType.active,"摩根投信",    None,      2,  2,Decimal("31.2"),  D1),
    ("00987A","主動台新優勢成長",                        ETFType.active,"台新投信",    None,      1,  1,Decimal("29.8"),  D1),
    ("00997A","主動群益美國增長",                        ETFType.active,"群益投信",    None,      1,  0,Decimal("14.1"),  D4),
    ("00986A","主動台新全球龍頭成長",                    ETFType.active,"台新投信",    None,      0,  0,Decimal("0.5"),   D8),
    ("00983A","主動中信ARK創新",                         ETFType.active,"中國信託投信",None,      2,  0,None,             D1),
    ("00989A","主動摩根美國科技",                        ETFType.active,"摩根投信",    None,      0,  0,None,             D8),
    ("00998A","主動復華金融股息",                        ETFType.active,"復華投信",    None,      1,  0,None,             D2),
    ("0050",  "元大台灣50",                              ETFType.stock, "元大投信",    None,     50,  0,Decimal("12800.0"),D_FEB),
    ("0056",  "元大高股息",                              ETFType.stock, "元大投信",    None,      1, 49,Decimal("5462.8"),D_FEB),
    ("006208","富邦台50",                                ETFType.stock, "富邦投信",    None,      0,  0,None,             D_MAR),
]


def _make_snapshots(etf_id, code: str, snap_date: date) -> list[HoldingsSnapshot]:
    holdings = HOLDINGS_BY_ETF.get(code) or _tw_holdings()
    return [
        HoldingsSnapshot(
            etf_id=etf_id,
            snapshot_date=snap_date,
            stock_ticker=ticker,
            shares=shares,
            weight_pct=weight,
        )
        for ticker, shares, weight in holdings
    ]


def _make_changes(etf_id, add_n: int, sell_n: int, change_date: date) -> list[HoldingsChange]:
    records = []
    for i in range(add_n):
        ticker = COMMON_BUYS[i] if i < len(COMMON_BUYS) else f"AB{i:03d}"
        amt = Decimal("1.20") + Decimal(str(i % 5)) * Decimal("0.30")
        records.append(HoldingsChange(
            etf_id=etf_id, change_date=change_date,
            stock_ticker=ticker, change_type=ChangeType.added,
            shares_before=0, shares_after=200_000 + i * 5_000,
            shares_delta=200_000 + i * 5_000, amount_billion=amt,
        ))
    for i in range(sell_n):
        ticker = COMMON_SELLS[i] if i < len(COMMON_SELLS) else f"SB{i:03d}"
        amt = Decimal("-0.80") - Decimal(str(i % 4)) * Decimal("0.20")
        records.append(HoldingsChange(
            etf_id=etf_id, change_date=change_date,
            stock_ticker=ticker, change_type=ChangeType.removed,
            shares_before=150_000, shares_after=0,
            shares_delta=-150_000, amount_billion=amt,
        ))
    return records


async def seed():
    async with AsyncSessionLocal() as session:
        await session.execute(delete(HoldingsChange))
        await session.execute(delete(HoldingsSnapshot))
        await session.execute(delete(ETF))
        await session.execute(delete(FundManager))
        await session.execute(delete(Stock))
        await session.commit()

        session.add_all([
            Stock(ticker=t, name=n, industry=ind, sub_industry=sub)
            for t, n, ind, sub in ALL_STOCKS
        ])
        await session.commit()

        mgr_objs = [FundManager(name=m["name"], bio=m["bio"]) for m in MANAGERS_DATA]
        session.add_all(mgr_objs)
        await session.commit()
        mgr_map = {m.name: m for m in mgr_objs}

        etf_objs = []
        for row in ETF_DATA:
            code, name, etype, company, mgr_name, add_n, sell_n, cap, _dt = row
            etf_objs.append(ETF(
                code=code, name=name, type=etype, fund_company=company,
                manager_id=mgr_map[mgr_name].id if mgr_name else None,
                market_cap_billion=cap,
            ))
        session.add_all(etf_objs)
        await session.commit()

        code_map = {e.code: e for e in etf_objs}
        all_snapshots, all_changes = [], []
        for row in ETF_DATA:
            code, _n, _t, _c, _m, add_n, sell_n, _cap, change_date = row
            etf_id = code_map[code].id
            all_snapshots.extend(_make_snapshots(etf_id, code, change_date))
            all_changes.extend(_make_changes(etf_id, add_n, sell_n, change_date))

        session.add_all(all_snapshots)
        session.add_all(all_changes)
        await session.commit()
        print(f"[OK] Seeded {len(etf_objs)} ETFs, {len(all_snapshots)} snapshots, {len(all_changes)} changes")


if __name__ == "__main__":
    asyncio.run(seed())
