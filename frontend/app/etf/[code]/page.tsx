import { getETF, getETFChanges, getETFHoldings } from "@/lib/api";
import ETFDetailTabs from "@/components/etf/ETFDetailTabs";
import Link from "next/link";
import type { ETF, ETFChanges, ETFHoldings } from "@/lib/types";

export default async function ETFDetailPage({ params }: { params: { code: string } }) {
  let etf: ETF | null = null;
  let changesData: ETFChanges | null = null;
  let holdingsData: ETFHoldings = { count: 0, holdings: [] };

  try {
    [etf, changesData, holdingsData] = await Promise.all([
      getETF(params.code),
      getETFChanges(params.code).catch(() => null),
      getETFHoldings(params.code).catch(() => ({ count: 0, holdings: [] })),
    ]);
  } catch {
    // backend not available
  }

  if (!etf) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6">
        <Link href="/" className="text-gray-400 hover:text-amber-500 text-sm">← 返回</Link>
        <p className="text-gray-500 mt-4">找不到 ETF：{params.code}</p>
      </div>
    );
  }

  const summary = etf.today_summary;
  const addedCount = summary?.added_count ?? 0;
  const removedCount = summary?.removed_count ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-amber-500 text-sm inline-flex items-center gap-1 mb-3">
          ← 返回列表
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{etf.name}</h1>
            <p className="text-sm text-amber-500 font-medium mt-0.5">代碼：{etf.code}</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* ETF 概況 */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">ETF 概況</p>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">持股數量</span>
              <span className="text-gray-900 font-bold">{holdingsData.count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">最新更新</span>
              <span className="text-gray-700">{holdingsData.snapshot_date ?? changesData?.change_date ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">總市值</span>
              <span className="text-gray-900 font-bold">
                {etf.market_cap_billion != null ? `$${Number(etf.market_cap_billion).toLocaleString()} 億` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 持股變化摘要 */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">持股變化摘要</p>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">新增／增加</span>
              <span className={`font-bold text-xl ${addedCount > 0 ? "text-amber-500" : "text-gray-300"}`}>
                {addedCount}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">移除／減少</span>
              <span className={`font-bold text-xl ${removedCount > 0 ? "text-red-500" : "text-gray-300"}`}>
                {removedCount}
              </span>
            </div>
            {changesData?.change_date && (
              <p className="text-xs text-gray-400 pt-1">異動日期：{changesData.change_date}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ETFDetailTabs etf={etf} holdings={holdingsData} changes={changesData} />
    </div>
  );
}
