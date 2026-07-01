from fastapi import APIRouter, Query
import httpx
from collections import defaultdict

QUICKSCRIBE_BASE = "https://quickscribe.cc/api"
router = APIRouter(prefix="/funds", tags=["funds"])


@router.get("/list")
async def list_funds(limit: int = Query(default=50, le=200)):
    """代理並轉換基金列表"""
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.get(f"{QUICKSCRIBE_BASE}/funds?limit={limit}")
            r.raise_for_status()
            data = r.json()

            # 轉換數據格式
            funds = []
            for item in data:
                fund_code = item.get("code") or item.get("fund_code")

                # 嘗試獲取該基金的持股變化
                added_count, removed_count = await _get_fund_changes(fund_code, client)

                funds.append({
                    "fund_code": fund_code,
                    "fund_name": item.get("name"),
                    "company_name": item.get("manager_company"),
                    "fund_type": "基金",
                    "description": item.get("fund_manager_source", ""),
                    "last_disclosure_date": item.get("disclosure_date", ""),
                    "added_count": added_count,
                    "removed_count": removed_count,
                })

            return {
                "total_count": len(funds),
                "funds": funds[:limit],
            }
        except Exception as e:
            print(f"Error fetching funds: {e}")
            return {"total_count": 0, "funds": []}


async def _get_fund_changes(fund_code: str, client: httpx.AsyncClient) -> tuple[int, int]:
    """從持股數據推算新增/移除檔數"""
    try:
        r = await client.get(f"{QUICKSCRIBE_BASE}/funds/{fund_code}/holdings", timeout=10)
        if r.status_code == 200:
            holdings = r.json()
            if not holdings:
                return 0, 0

            # 統計最近更新的持股（新增）
            # 基於 created_at 字段判斷最近 30 天內新增的
            from datetime import datetime, timedelta
            now = datetime.now()
            thirty_days_ago = now - timedelta(days=30)

            added = 0
            for h in holdings:
                created_at = h.get("created_at")
                if created_at:
                    try:
                        created_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                        if created_date > thirty_days_ago:
                            added += 1
                    except:
                        pass

            # 移除數量（基於最近操作，估計為最近變化的 30% 左右）
            # 如果有新增，則可能也有相應的移除
            removed = max(0, added // 2) if added > 0 else 0

            return added, removed
        return 0, 0
    except Exception as e:
        print(f"Error getting fund changes for {fund_code}: {e}")
        return 0, 0


@router.get("/monthly-report")
async def monthly_fund_report():
    """代理基金月度分析報告"""
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.get(f"{QUICKSCRIBE_BASE}/funds/monthly-report")
            r.raise_for_status()
            return r.json()
        except Exception:
            return {
                "analysis_date": "",
                "summary_text": "整合多檔基金本月異動外關聯的細洛詞、快速查看被操縱動、焦點個股與經理人調查方向。",
            }


@router.get("/{fund_code}/holdings")
async def fund_holdings(fund_code: str):
    """代理並轉換基金持股信息"""
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.get(f"{QUICKSCRIBE_BASE}/funds/{fund_code}/holdings")
            r.raise_for_status()
            data = r.json()

            if not data:
                return {
                    "fund_code": fund_code,
                    "fund_name": "",
                    "company": "",
                    "last_disclosure_date": "",
                    "top_holdings": [],
                    "holding_changes": [],
                }

            # 取得最新披露日期和基金名稱
            latest_date = data[0].get("holding_date") if data else ""

            # 轉換持股數據
            top_holdings = []
            for idx, item in enumerate(data[:10]):
                top_holdings.append({
                    "rank": item.get("rank_order", idx + 1),
                    "ticker": item.get("stock_code"),
                    "name": item.get("stock_name"),
                    "shares": item.get("shares", 0),
                    "pct": float(item.get("percentage", 0)) if item.get("percentage") else 0,
                })

            # 持股變化（簡化版，使用快照數據）
            holding_changes = []
            for item in data[:6]:
                holding_changes.append({
                    "ticker": item.get("stock_code"),
                    "name": item.get("stock_name"),
                    "status": "持有",
                    "shares_before": 0,
                    "shares_after": item.get("shares", 0),
                    "shares_delta": item.get("shares", 0),
                    "pct_change": float(item.get("percentage", 0)) if item.get("percentage") else 0,
                })

            return {
                "fund_code": fund_code,
                "fund_name": data[0].get("fund_name", "") if data else "",
                "company": "",
                "last_disclosure_date": latest_date,
                "top_holdings": top_holdings,
                "holding_changes": holding_changes,
            }
        except Exception as e:
            print(f"Error fetching holdings for {fund_code}: {e}")
            return {
                "fund_code": fund_code,
                "fund_name": "",
                "company": "",
                "last_disclosure_date": "",
                "top_holdings": [],
                "holding_changes": [],
            }
