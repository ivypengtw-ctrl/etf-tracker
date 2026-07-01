import type { DashboardSummary } from "@/lib/types";

export default function StatsCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
        <p className="text-xs text-gray-500 mb-1">今日全市場加碼</p>
        <p className="text-2xl font-black text-green-600 font-mono leading-none">
          +{Number(summary.total_buy_billion).toFixed(1)}
          <span className="text-sm font-semibold ml-1 text-green-500">億</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">{summary.etf_count_buy} 檔 ETF 加倉</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
        <p className="text-xs text-gray-500 mb-1">今日減碼</p>
        <p className="text-2xl font-black text-red-500 font-mono leading-none">
          -{Number(summary.total_sell_billion).toFixed(1)}
          <span className="text-sm font-semibold ml-1 text-red-400">億</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">{summary.etf_count_sell} 檔 ETF 減倉</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
        <p className="text-xs text-gray-500 mb-1">ETF 總數</p>
        <p className="text-2xl font-black text-amber-500 font-mono leading-none">
          {summary.total_etf_count}
          <span className="text-sm font-semibold ml-1 text-amber-400">支</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">追蹤中</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
        <p className="text-xs text-gray-500 mb-1">今日更新</p>
        <p className="text-2xl font-black text-gray-700 font-mono leading-none">
          {summary.updated_count}
          <span className="text-sm font-semibold ml-1 text-gray-400">/ {summary.total_etf_count}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">已完成</p>
      </div>
    </div>
  );
}
