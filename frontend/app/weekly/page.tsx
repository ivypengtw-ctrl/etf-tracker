import { getWeeklyManagerSummary } from "@/lib/api";
import Link from "next/link";
import type { WeeklyManagerSummary, WeeklyManagerStock } from "@/lib/types";

function toeBillion(amount: number) {
  return (amount / 1e8).toFixed(1);
}

function FlowBadge({ amount }: { amount: number }) {
  const positive = amount >= 0;
  return (
    <span className={`tabular-nums font-semibold ${positive ? "text-amber-500" : "text-red-500"}`}>
      {positive ? "+" : ""}{toeBillion(amount)} 億
    </span>
  );
}

function StockTable({
  items,
  accent,
}: {
  items: WeeklyManagerStock[];
  accent: "amber" | "red";
}) {
  if (!items.length) return <p className="px-5 py-4 text-sm text-gray-400">無資料</p>;
  const isPos = accent === "amber";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b ${isPos ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
            {["股票代號", "股票名稱", "ETF 數", "持倉 ETF", "淨變化 (股)", "流量 (億)"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={`${item.stock_code}-${i}`} className={`border-b border-gray-50 hover:bg-amber-50/20 transition-colors ${i % 2 !== 0 ? "bg-gray-50/30" : ""}`}>
              <td className="px-4 py-3">
                <Link href={`/stock/${item.stock_code}`} className="text-amber-500 hover:text-amber-600 font-bold">
                  {item.stock_code}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700 font-medium max-w-[160px] truncate">{item.stock_name}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${isPos ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
                  {item.etf_count}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {item.etf_codes.slice(0, 5).map((code) => (
                    <Link key={code} href={`/etf/${code}`} className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-medium hover:bg-amber-100 transition-colors">
                      {code}
                    </Link>
                  ))}
                  {item.etf_codes.length > 5 && (
                    <span className="text-xs text-gray-400 px-1">+{item.etf_codes.length - 5}</span>
                  )}
                </div>
              </td>
              <td className={`px-4 py-3 tabular-nums font-medium ${item.net_shares_change >= 0 ? "text-amber-500" : "text-red-500"}`}>
                {item.net_shares_change >= 0 ? "+" : ""}{item.net_shares_change.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <FlowBadge amount={item.net_flow_amount} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: "amber" | "red";
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className={`px-5 py-4 border-b ${accent === "amber" ? "border-amber-50 bg-amber-50/50" : "border-red-50 bg-red-50/50"}`}>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export default async function WeeklyManagerSummaryPage() {
  let data: WeeklyManagerSummary | null = null;
  try {
    data = await getWeeklyManagerSummary();
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
        <h1 className="text-2xl font-black text-gray-800">主動 ETF 週報 · 經理人動向</h1>
        {data && (
          <p className="text-sm text-gray-400 mt-1">
            分析區間：{data.window_start_date} ～ {data.window_end_date}　已揭露：{data.disclosed_etf_count}/{data.total_active_etf_count} 家
          </p>
        )}
      </div>

      {!data ? (
        <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center text-gray-400">
          資料載入失敗，請稍後再試。
        </div>
      ) : (
        <div className="space-y-6">
          {/* 本週淨流向摘要卡 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">本週淨流入</p>
              <p className={`text-2xl font-black ${data.weekly_net_flow_amount >= 0 ? "text-amber-500" : "text-red-500"}`}>
                {data.weekly_net_flow_amount >= 0 ? "+" : ""}{toeBillion(data.weekly_net_flow_amount)} 億
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">共識買進</p>
              <p className="text-2xl font-black text-amber-500">{data.consensus_buys.length} 支</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">共識賣出</p>
              <p className="text-2xl font-black text-red-500">{data.consensus_sells.length} 支</p>
            </div>
          </div>

          {/* AI 摘要文字 */}
          {data.summary_text && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 px-5 py-4">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">本週摘要</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{data.summary_text}</pre>
            </div>
          )}

          {/* 共識買進 */}
          <Section
            title="共識買進"
            subtitle="多家 ETF 經理人同步看好，共同加碼的標的"
            accent="amber"
          >
            <StockTable items={data.consensus_buys} accent="amber" />
          </Section>

          {/* 集中加碼 */}
          <Section
            title="集中加碼"
            subtitle="雖非多家共識，但流量集中、加碼力道大的標的"
            accent="amber"
          >
            <StockTable items={data.focused_buys} accent="amber" />
          </Section>

          {/* 共識賣出 */}
          <Section
            title="共識賣出"
            subtitle="多家 ETF 經理人同步減碼或移除的標的"
            accent="red"
          >
            <StockTable items={data.consensus_sells} accent="red" />
          </Section>

          {/* 集中減碼 */}
          <Section
            title="集中減碼"
            subtitle="流量集中、賣壓明顯的標的"
            accent="red"
          >
            <StockTable items={data.focused_sells} accent="red" />
          </Section>
        </div>
      )}
    </div>
  );
}
