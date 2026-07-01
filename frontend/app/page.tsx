import { getDashboardSummary, listETFs } from "@/lib/api";
import UpdateBar from "@/components/home/UpdateBar";
import StatsCards from "@/components/home/StatsCards";
import ETFTable from "@/components/home/ETFTable";
import RankingSidebar from "@/components/home/RankingSidebar";
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
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-800">ETF 持股分析
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-600 text-sm font-bold rounded-lg">{etfs.length} 檔</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">主動型 ETF 與被動指數型 ETF，依總市值排序。增減代表最新持股異動檔數。</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <a
              href="/stocks"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
            >
              個股分析
            </a>
            <a
              href="/common"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-amber-200 text-amber-600 text-sm font-bold rounded-xl hover:bg-amber-50 transition-colors shadow-sm"
            >
              ETF 共同持股分析
            </a>
            <a
              href="/weekly"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-amber-200 text-amber-600 text-sm font-bold rounded-xl hover:bg-amber-50 transition-colors shadow-sm"
            >
              週報 · 經理人動向
            </a>
          </div>
        </div>
        <StatsCards summary={summary} />
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0">
            <ETFTable etfs={etfs} />
          </div>
          <RankingSidebar summary={summary} />
        </div>
      </div>
    </>
  );
}
