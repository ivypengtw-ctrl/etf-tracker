import type { DashboardSummary } from "@/lib/types";

export default function UpdateBar({ summary }: { summary: DashboardSummary }) {
  const pct = summary.total_etf_count
    ? Math.round((summary.updated_count / summary.total_etf_count) * 100)
    : 0;

  return (
    <div className="flex items-center gap-3 px-6 py-2 bg-amber-50 border-b border-amber-100 text-xs text-gray-400">
      <span>資料更新</span>
      <div className="w-24 h-1 rounded-full bg-amber-100">
        <div className="h-1 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-semibold text-amber-500">
        {summary.updated_count} / {summary.total_etf_count} 已更新
      </span>
      <span className="border-l border-amber-200 pl-3 flex-1 text-gray-500">{summary.summary_text}</span>
    </div>
  );
}
