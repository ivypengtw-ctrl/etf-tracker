import type { DashboardSummary } from "@/lib/types";

type RankItem = {
  ticker?: string;
  etf_code?: string;
  name?: string;
  etf_name?: string;
  total_amount_billion?: number;
};

function RankSection({ title, items, positive }: { title: string; items: RankItem[]; positive: boolean }) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => Math.abs(Number(i.total_amount_billion ?? 0))), 0.01);

  return (
    <div>
      <p className={`text-xs font-bold mb-2 ${positive ? "text-amber-500" : "text-gray-500"}`}>{title}</p>
      <div className="space-y-2">
        {items.map((item, i) => {
          const val = Math.abs(Number(item.total_amount_billion ?? 0));
          const pct = (val / max) * 100;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-gray-400 w-3 shrink-0">{i + 1}</span>
                  <span className={`text-xs font-bold shrink-0 ${positive ? "text-amber-500" : "text-gray-600"}`}>
                    {item.ticker ?? item.etf_code}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">{item.name ?? item.etf_name}</span>
                </div>
                <span className={`text-[10px] font-bold shrink-0 ml-2 ${positive ? "text-green-600" : "text-red-500"}`}>
                  {positive ? "+" : ""}{val.toFixed(1)}億
                </span>
              </div>
              <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${positive ? "bg-amber-400" : "bg-red-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RankingSidebar({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="w-56 shrink-0 rounded-2xl border border-amber-100 bg-white shadow-sm p-4 self-start">
      <RankSection title="同步加碼 TOP 3" items={summary.top_cross_buys} positive={true} />
      {summary.top_cross_buys.length > 0 && <div className="my-3 border-t border-amber-50" />}
      <RankSection title="同步減碼 TOP 3" items={summary.top_cross_sells} positive={false} />
      {summary.top_cross_sells.length > 0 && <div className="my-3 border-t border-amber-50" />}
      <RankSection title="加碼最多 ETF" items={summary.top_etfs_buy} positive={true} />
      <div className="mt-4 pt-3 border-t border-amber-50 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="text-[10px] text-gray-400">即時更新中</span>
      </div>
    </div>
  );
}
