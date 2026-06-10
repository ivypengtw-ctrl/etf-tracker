import { getDashboardSummary, listETFs } from "@/lib/api";
import UpdateBar from "@/components/home/UpdateBar";
import StatsCards from "@/components/home/StatsCards";
import CrossETFRankings from "@/components/home/CrossETFRankings";
import ETFTable from "@/components/home/ETFTable";
import type { DashboardSummary, ETF } from "@/lib/types";

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: { search?: string; type?: string };
}) {
  let summary: DashboardSummary = EMPTY_SUMMARY;
  let etfs: ETF[] = [];

  try {
    [summary, etfs] = await Promise.all([
      getDashboardSummary(),
      listETFs(searchParams.search, searchParams.type),
    ]);
  } catch {
    // Backend not available — render empty state
  }

  return (
    <>
      <UpdateBar summary={summary} />
      <div className="max-w-7xl mx-auto px-6 py-5">
        <StatsCards summary={summary} />
        <CrossETFRankings summary={summary} />
        <ETFTable etfs={etfs} />
      </div>
    </>
  );
}
