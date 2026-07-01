import { getFundDetail } from "@/lib/api";
import Link from "next/link";
import type { FundDetail } from "@/lib/types";

export default async function FundDetailPage({ params }: { params: { fund_code: string } }) {
  let fund: FundDetail | null = null;

  try {
    fund = await getFundDetail(params.fund_code);
  } catch (err) {
    console.error("Failed to fetch fund detail:", err);
  }

  if (!fund) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6">
        <Link href="/funds" className="text-amber-500 hover:text-amber-600 text-sm inline-flex items-center gap-1 mb-4">
          ← 返回基金列表
        </Link>
        <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center text-gray-400">
          基金信息載入失敗，請稍後再試。
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Breadcrumb */}
      <Link href="/funds" className="text-amber-500 hover:text-amber-600 text-sm inline-flex items-center gap-1 mb-4">
        ← 返回基金列表
      </Link>

      {/* Fund Header */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">🏢</span>
              <div>
                <p className="text-sm text-gray-500">{fund.fund_code}</p>
                <h1 className="text-2xl font-black text-gray-800">{fund.fund_name}</h1>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{fund.company}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-gray-500">最新披露</p>
            <p className="text-lg font-bold text-gray-800">{fund.last_disclosure_date}</p>
          </div>
        </div>
      </div>

      {/* Top Holdings */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
          <h2 className="text-lg font-bold text-gray-800">最近一個調期所持十大持股</h2>
          <p className="text-xs text-gray-500 mt-1">截至 {fund.last_disclosure_date}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">排序</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">股票代碼</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">股票名稱</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">持股數量</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">占比例</th>
              </tr>
            </thead>
            <tbody>
              {fund.top_holdings.map((holding, idx) => (
                <tr key={`${holding.ticker}-${idx}`} className={`border-b border-gray-100 hover:bg-amber-50/30 transition-colors ${idx % 2 !== 0 ? "bg-gray-50/20" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-gray-600">{holding.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/stock/${holding.ticker}`} className="text-amber-500 hover:text-amber-600 font-bold">
                      {holding.ticker}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{holding.name}</td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums text-right">{holding.shares.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-right text-gray-800">{holding.pct.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holding Changes */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
          <h2 className="text-lg font-bold text-gray-800">過去投資報價期動的持股變化</h2>
          <p className="text-xs text-gray-500 mt-1">最近一個調期內的個股持股異動</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">股票代碼</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">股票名稱</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">狀態</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">變化前持股數</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">變化後持股數</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">持股變化</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">變化幅度</th>
              </tr>
            </thead>
            <tbody>
              {fund.holding_changes.map((change, idx) => {
                const statusColors: Record<string, string> = {
                  "新增": "bg-green-100 text-green-700",
                  "加碼": "bg-green-50 text-green-600",
                  "減碼": "bg-amber-50 text-amber-600",
                  "移除": "bg-red-100 text-red-700",
                };
                const isIncrease = change.shares_delta > 0;
                return (
                  <tr key={`${change.ticker}-${idx}`} className={`border-b border-gray-100 hover:bg-amber-50/30 transition-colors ${idx % 2 !== 0 ? "bg-gray-50/20" : ""}`}>
                    <td className="px-4 py-3">
                      <Link href={`/stock/${change.ticker}`} className="text-amber-500 hover:text-amber-600 font-bold">
                        {change.ticker}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{change.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${statusColors[change.status]}`}>
                        {change.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums text-right">{change.shares_before.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums text-right">{change.shares_after.toLocaleString()}</td>
                    <td className={`px-4 py-3 tabular-nums text-right font-semibold ${isIncrease ? "text-green-600" : "text-red-600"}`}>
                      {isIncrease ? "+" : ""}{change.shares_delta.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 tabular-nums text-right font-semibold ${isIncrease ? "text-green-600" : "text-red-600"}`}>
                      {isIncrease ? "+" : ""}{change.pct_change.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
