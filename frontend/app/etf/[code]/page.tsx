import { getETF, getETFChanges } from "@/lib/api";
import HoldingsList from "@/components/etf/HoldingsList";
import Link from "next/link";
import type { ETF, ETFChanges } from "@/lib/types";

export default async function ETFDetailPage({ params }: { params: { code: string } }) {
  let etf: ETF | null = null;
  let changesData: ETFChanges | null = null;

  try {
    [etf, changesData] = await Promise.all([
      getETF(params.code),
      getETFChanges(params.code),
    ]);
  } catch {
    // Backend not available
  }

  if (!etf) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6">
        <p className="text-slate-400">找不到 ETF：{params.code}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="mb-6">
        <p className="text-sky-400 font-semibold text-lg">{etf.code}</p>
        <h1 className="text-2xl font-bold text-white mb-1">{etf.name}</h1>
        <div className="flex gap-4 text-xs text-slate-500">
          <span>投信：{etf.fund_company}</span>
          {etf.inception_date && <span>成立：{etf.inception_date}</span>}
          {etf.manager && (
            <span>
              經理人：
              <Link href={`/manager/${etf.manager.id}`} className="text-sky-400 hover:underline ml-1">
                {etf.manager.name}
              </Link>
            </span>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="font-semibold text-sm">今日成分股異動</p>
        </div>
        <HoldingsList changes={changesData?.changes ?? []} />
      </div>
    </div>
  );
}
