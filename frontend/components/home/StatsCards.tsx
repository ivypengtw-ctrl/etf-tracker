import type { DashboardSummary } from "@/lib/types";

export default function StatsCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="rounded-xl p-4 border border-green-900/30 bg-gradient-to-br from-green-950/40 to-green-950/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-1">今日全市場加碼</p>
        <p className="text-3xl font-extrabold text-green-400">+{summary.total_buy_billion.toFixed(1)} 億</p>
        <p className="text-xs text-slate-500 mt-1">共 {summary.etf_count_buy} 檔 ETF 有加碼</p>
      </div>
      <div className="rounded-xl p-4 border border-red-900/30 bg-gradient-to-br from-red-950/40 to-red-950/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-1">今日全市場減碼</p>
        <p className="text-3xl font-extrabold text-red-400">{summary.total_sell_billion.toFixed(1)} 億</p>
        <p className="text-xs text-slate-500 mt-1">共 {summary.etf_count_sell} 檔 ETF 有減碼</p>
      </div>
    </div>
  );
}
