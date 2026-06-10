import type { DashboardSummary } from "@/lib/types";

export default function UpdateBar({ summary }: { summary: DashboardSummary }) {
  const pct = summary.total_etf_count
    ? Math.round((summary.updated_count / summary.total_etf_count) * 100)
    : 0;

  return (
    <div className="flex items-center gap-3 px-6 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-500">
      <span>資料更新</span>
      <div className="w-24 h-1 rounded-full bg-slate-800">
        <div className="h-1 rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-semibold text-sky-400">
        {summary.updated_count} / {summary.total_etf_count} 已更新
      </span>
      <span className="border-l border-slate-700 pl-3 flex-1">{summary.summary_text}</span>
    </div>
  );
}
