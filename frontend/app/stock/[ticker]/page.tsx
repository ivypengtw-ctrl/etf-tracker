import { getStock } from "@/lib/api";
import Link from "next/link";
import type { Stock } from "@/lib/types";

export default async function StockPage({ params }: { params: { ticker: string } }) {
  let stock: Stock | null = null;

  try {
    stock = await getStock(params.ticker);
  } catch {
    // Backend not available
  }

  if (!stock) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-6">
        <p className="text-slate-400">找不到個股：{params.ticker}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="mb-6">
        <p className="text-sky-400 font-semibold text-lg">{stock.ticker}</p>
        <h1 className="text-2xl font-bold text-white">{stock.name}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "行業別", value: stock.industry },
          { label: "次行業", value: stock.sub_industry },
          { label: "成立年份", value: stock.founding_year },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-sm font-semibold text-slate-200">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      {stock.main_business && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500 mb-2">主要業務</p>
          <p className="text-sm text-slate-300 leading-relaxed">{stock.main_business}</p>
        </div>
      )}

      {stock.held_by.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <p className="px-4 py-3 border-b border-slate-800 text-sm font-semibold">持有此股票的 ETF</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-500">
                {["ETF 代碼", "名稱", "持倉比例"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left border-b border-slate-800">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stock.held_by.map((h) => (
                <tr key={h.etf_code} className="border-b border-slate-900 hover:bg-slate-800/20">
                  <td className="px-4 py-2">
                    <Link href={`/etf/${h.etf_code}`} className="text-sky-400 hover:underline">{h.etf_code}</Link>
                  </td>
                  <td className="px-4 py-2 text-slate-300">{h.etf_name}</td>
                  <td className="px-4 py-2 text-slate-400">{h.weight_pct.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
