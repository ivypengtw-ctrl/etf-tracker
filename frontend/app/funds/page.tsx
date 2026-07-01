import { getFundsList, getMonthlyFundReport } from "@/lib/api";
import Link from "next/link";
import type { Fund, MonthlyFundReport } from "@/lib/types";

export default async function FundsPage() {
  let fundsData = { total_count: 0, funds: [] };
  let monthlyReport: MonthlyFundReport | null = null;

  try {
    const [funds, report] = await Promise.all([
      getFundsList(100).catch(() => null),
      getMonthlyFundReport().catch(() => null),
    ]);
    if (funds) fundsData = funds;
    if (report) monthlyReport = report;
  } catch (err) {
    console.error("Failed to fetch funds:", err);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">基金列表</h1>
        <p className="text-sm text-gray-400 mt-1">
          基金會延續 ETF 列表的比較方式呈現，但資料來源是低頻購票・未登入可先看基金基本資訊；登入後可一步查看更一大持股與觀看變化。
        </p>
      </div>

      {/* Monthly Report Card */}
      {monthlyReport && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-600 tracking-wide">MONTHLY FUND REPORT</p>
                  <h2 className="text-lg font-bold text-gray-800">基金月度分析</h2>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                整合多檔基金本月異動外關聯的細洛詞、快速查看被操縱動、焦點個股與經理人調查方向。
              </p>
            </div>
            <a
              href="#"
              className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors flex-shrink-0 whitespace-nowrap"
            >
              <span>📈</span>
              立即查看月報
            </a>
          </div>
        </div>
      )}

      {/* Tracked Funds */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800">已追蹤基金</h2>
          <p className="text-xs text-gray-400 mt-1">
            依最近規模日期排序，方便從追看最新中的基金持股。
          </p>
        </div>

        {!fundsData || !fundsData.funds || fundsData.funds.length === 0 ? (
          <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center text-gray-400">
            <p>目前無基金資料</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fundsData.funds.map((fund: Fund) => (
              <FundCard key={fund.fund_code} fund={fund} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FundCard({ fund }: { fund: Fund }) {
  return (
    <Link
      href={`/funds/${fund.fund_code}`}
      className="block bg-white rounded-2xl border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all p-5 flex items-start justify-between gap-4"
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* Fund Code & Badge */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏢</span>
            <div>
              <p className="text-lg font-black text-gray-800">{fund.fund_code}</p>
              {fund.fund_type && (
                <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-600 text-xs font-bold rounded mt-1">
                  {fund.fund_type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fund Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-800 mb-1">{fund.fund_name}</h3>
          <p className="text-xs text-gray-500 mb-2">{fund.company_name}</p>
          {fund.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{fund.description}</p>
          )}
        </div>
      </div>

      {/* Right Side - Date & Changes */}
      <div className="flex-shrink-0 text-right">
        {fund.last_disclosure_date && (
          <p className="text-xs text-gray-500 mb-2">最新披露 {fund.last_disclosure_date}</p>
        )}
        <div className="flex items-center gap-2 justify-end">
          {fund.added_count !== undefined && fund.added_count > 0 && (
            <span className="inline-block px-2 py-1 bg-green-50 text-green-600 text-xs font-bold rounded">
              新增 {fund.added_count} 檔
            </span>
          )}
          {fund.removed_count !== undefined && fund.removed_count > 0 && (
            <span className="inline-block px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded">
              移除 {fund.removed_count} 檔
            </span>
          )}
          <span className="text-amber-500 ml-2">→</span>
        </div>
      </div>
    </Link>
  );
}
