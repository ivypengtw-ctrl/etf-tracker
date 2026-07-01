import { getCommonHoldings } from "@/lib/api";
import Link from "next/link";
import type { CommonHoldings } from "@/lib/types";

export default async function CommonHoldingsPage() {
  let data: CommonHoldings | null = null;
  try {
    data = await getCommonHoldings();
  } catch {
    // backend not available
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-amber-500 text-sm inline-flex items-center gap-1 mb-3">
          ← 返回首頁
        </Link>
        <h1 className="text-2xl font-black text-gray-800">
          ETF 共同持股分析
          {data && (
            <span className="ml-2 text-sm font-normal text-gray-400">分析日期：{data.analysis_date}</span>
          )}
        </h1>
        <p className="text-sm text-gray-400 mt-1">多檔 ETF 共同看好的股票、同步增持標的與本週新進場個股。</p>
      </div>

      {!data ? (
        <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center text-gray-400">
          資料載入失敗，請稍後再試。
        </div>
      ) : (
        <div className="space-y-6">
          {/* 多檔 ETF 同步增持 */}
          <Section title="多檔 ETF 同步增持" subtitle="近 14 天同時加碼或新增的股票">
            {data.recent_multi_etf_increases.length === 0 ? (
              <EmptyState text="近期無多檔 ETF 同步增持資料" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50 border-b border-amber-100">
                    {["股票代號", "股票名稱", "買入 ETF 數", "共同持倉 ETF", "總增加股數"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent_multi_etf_increases.map((item, i) => (
                    <tr key={item.stock_code} className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${i % 2 !== 0 ? "bg-gray-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <Link href={`/stock/${item.stock_code}`} className="text-amber-500 hover:text-amber-600 font-bold">
                          {item.stock_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.stock_name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-black text-base">
                          {item.etf_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.etf_codes.map((code) => (
                            <Link key={code} href={`/etf/${code}`} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-medium hover:bg-amber-100 transition-colors">
                              {code}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-amber-500 font-semibold tabular-nums">
                        +{(item.total_delta ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* 重疊持股排行 */}
          <Section title="重疊持股排行" subtitle="最多 ETF 同時持有的個股（依持有 ETF 數排序）">
            {data.top_overlap.length === 0 ? (
              <EmptyState text="無重疊持股資料" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50 border-b border-amber-100">
                    {["排名", "股票代號", "股票名稱", "持有 ETF 數", "ETF 列表"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.top_overlap.map((item, i) => (
                    <tr key={item.stock_code} className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${i % 2 !== 0 ? "bg-gray-50/30" : ""}`}>
                      <td className="px-4 py-3 text-gray-400 font-bold text-xs w-10">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/stock/${item.stock_code}`} className="text-amber-500 hover:text-amber-600 font-bold">
                          {item.stock_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.stock_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-black text-base">
                            {item.etf_count}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                            <div
                              className="bg-amber-400 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, (item.etf_count / (data.top_overlap[0]?.etf_count || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.etf_codes.map((code) => (
                            <Link key={code} href={`/etf/${code}`} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-medium hover:bg-amber-100 transition-colors">
                              {code}
                            </Link>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* 本週新增持股 */}
          <Section title="本週新進場個股" subtitle="近 14 天各 ETF 首次買入的標的">
            {data.weekly_new_holdings.length === 0 ? (
              <EmptyState text="近期無新增持股資料" />
            ) : (
              <div className="divide-y divide-gray-100">
                {data.weekly_new_holdings.map((etfEntry) => (
                  <div key={etfEntry.etf_code} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Link href={`/etf/${etfEntry.etf_code}`} className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-full font-bold hover:bg-amber-600 transition-colors">
                        {etfEntry.etf_code}
                      </Link>
                      <span className="text-sm font-medium text-gray-700">{etfEntry.etf_name}</span>
                      <span className="text-xs text-gray-400">新增 {etfEntry.stocks.length} 檔</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {etfEntry.stocks.map((s) => (
                        <Link
                          key={s.stock_code}
                          href={`/stock/${s.stock_code}`}
                          className="group flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors"
                        >
                          <span className="text-amber-600 font-bold text-xs">{s.stock_code}</span>
                          <span className="text-gray-600 text-xs">{s.stock_name}</span>
                          <span className="text-gray-400 text-xs">{s.date}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-50">
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-gray-400 text-sm px-5 py-6">{text}</p>;
}
