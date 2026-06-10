import type { DashboardSummary } from "@/lib/types";

function RankCard({
  title,
  items,
  positive,
}: {
  title: string;
  items: Array<{ ticker?: string; etf_code?: string; name?: string; etf_name?: string; etf_count?: number; total_amount_billion?: number }>;
  positive: boolean;
}) {
  const color = positive ? "text-green-400" : "text-red-400";
  const borderColor = positive ? "border-green-900/40" : "border-red-900/40";

  return (
    <div className={`bg-slate-900 border ${borderColor} rounded-xl p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${color} mb-3 pb-2 border-b border-slate-800`}>
        {title}
      </p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-900/50 last:border-0">
          <span className="text-xs text-slate-600 font-bold w-3">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${color}`}>{item.ticker ?? item.etf_code}</p>
            <p className="text-[10px] text-slate-500 truncate">{item.name ?? item.etf_name}</p>
          </div>
          <span className={`text-xs font-bold ${color}`}>
            {positive ? "+" : ""}{item.total_amount_billion?.toFixed(1)} 億
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CrossETFRankings({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <RankCard title="同步加碼 Top 3" items={summary.top_cross_buys} positive={true} />
      <RankCard title="同步減碼 Top 3" items={summary.top_cross_sells} positive={false} />
      <RankCard title="加碼最多 ETF Top 3" items={summary.top_etfs_buy} positive={true} />
      <RankCard title="減碼最多 ETF Top 3" items={summary.top_etfs_sell} positive={false} />
    </div>
  );
}
