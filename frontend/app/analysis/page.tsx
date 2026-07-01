import { getDashboardSummary } from "@/lib/api";
import DailyAnalysisPage from "@/components/analysis/DailyAnalysisPage";
import type { DashboardSummary } from "@/lib/types";

const EMPTY_SUMMARY: DashboardSummary = {
  date: new Date().toISOString().split("T")[0],
  total_buy_billion: 0,
  total_sell_billion: 0,
  etf_count_buy: 0,
  etf_count_sell: 0,
  updated_count: 0,
  total_etf_count: 0,
  summary_text: "尚無資料，請稍後再試。",
  top_cross_buys: [],
  top_cross_sells: [],
  top_etfs_buy: [],
  top_etfs_sell: [],
};

export default async function AnalysisPage() {
  let summary: DashboardSummary = EMPTY_SUMMARY;
  try {
    summary = await getDashboardSummary();
  } catch {
    // backend not available — render empty state
  }

  return <DailyAnalysisPage summary={summary} />;
}
