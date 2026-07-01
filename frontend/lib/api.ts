const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getDashboardSummary(date?: string) {
  const q = date ? `?date=${date}` : "";
  return get<import("./types").DashboardSummary>(`/dashboard/summary${q}`);
}

export async function listETFs(search?: string, type?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (type) params.set("type", type);
  const q = params.size ? `?${params}` : "";
  return get<import("./types").ETF[]>(`/etfs${q}`);
}

export async function getETF(code: string) {
  return get<import("./types").ETF>(`/etfs/${code}`);
}

export async function getETFHoldings(code: string) {
  return get<import("./types").ETFHoldings>(`/etfs/${code}/holdings`);
}

export async function getETFChanges(code: string, date?: string) {
  const q = date ? `?date=${date}` : "";
  return get<import("./types").ETFChanges>(`/etfs/${code}/changes${q}`);
}

export async function getManager(id: string) {
  return get<import("./types").FundManager>(`/managers/${id}`);
}

export async function getStock(ticker: string) {
  return get<import("./types").Stock>(`/stocks/${ticker}`);
}

export async function getCommonHoldings() {
  return get<import("./types").CommonHoldings>(`/dashboard/common-holdings`);
}

export async function getWeeklyManagerSummary() {
  return get<import("./types").WeeklyManagerSummary>(`/dashboard/weekly-manager-summary`);
}

export async function getTurnoverRanking(limit = 50) {
  return get<import("./types").TurnoverRanking>(`/stocks/turnover-ranking?limit=${limit}`);
}

export async function getFundsList(limit = 50) {
  return get<import("./types").FundsList>(`/funds/list?limit=${limit}`);
}

export async function getMonthlyFundReport() {
  return get<import("./types").MonthlyFundReport>(`/funds/monthly-report`);
}

export async function getFundDetail(fund_code: string) {
  return get<import("./types").FundDetail>(`/funds/${fund_code}/holdings`);
}

export async function createAlert(payload: {
  channel: string;
  contact: string;
  etf_code?: string;
  threshold_pct?: number;
}) {
  const res = await fetch(`${BASE}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create alert failed: ${res.status}`);
  return res.json();
}
