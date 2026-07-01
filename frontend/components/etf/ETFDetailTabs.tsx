"use client";

import { useState } from "react";
import Link from "next/link";
import type { ETF, ETFChanges, ETFHoldings } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  stock: "股票型",
  bond: "債券型",
  active: "主動型",
  other: "其他",
};

const CHANGE_LABEL: Record<string, string> = {
  added: "新增",
  removed: "刪除",
  increased: "加碼",
  decreased: "減碼",
};

function BasicTab({ etf }: { etf: ETF }) {
  const rows = [
    { label: "ETF 代碼", value: etf.code },
    { label: "基金名稱", value: etf.name },
    { label: "類型", value: TYPE_LABEL[etf.type] ?? etf.type },
    { label: "投信公司", value: etf.fund_company },
    { label: "經理人", value: etf.manager?.name ?? "—" },
    { label: "成立日期", value: etf.inception_date ?? "—" },
    { label: "總市值 (億)", value: etf.market_cap_billion != null ? `$${Number(etf.market_cap_billion).toLocaleString()}` : "—" },
    { label: "NAV 漲跌幅", value: etf.nav_change_pct != null ? `${Number(etf.nav_change_pct) >= 0 ? "+" : ""}${Number(etf.nav_change_pct).toFixed(2)}%` : "—" },
    { label: "歷史高點", value: etf.all_time_high != null ? `$${Number(etf.all_time_high).toFixed(2)}` : "—" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      {rows.map(({ label, value }, i) => (
        <div
          key={label}
          className={`flex justify-between px-5 py-3.5 text-sm ${i % 2 === 0 ? "bg-white" : "bg-amber-50/40"} ${i !== rows.length - 1 ? "border-b border-gray-100" : ""}`}
        >
          <span className="text-gray-500">{label}</span>
          <span className="text-gray-800 font-medium">{value}</span>
        </div>
      ))}
      {etf.manager && (
        <div className="px-5 py-3 border-t border-amber-100 bg-amber-50/40">
          <Link href={`/manager/${etf.manager.id}`} className="text-amber-500 hover:text-amber-600 text-xs font-medium">
            查看經理人詳細資料 →
          </Link>
        </div>
      )}
    </div>
  );
}

function HoldingsTab({ data }: { data: ETFHoldings }) {
  const [starred, setStarred] = useState<Set<string>>(new Set());

  if (!data.holdings.length) {
    return <p className="text-gray-400 text-sm px-4 py-6">無持股資料</p>;
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-amber-100">
              {["股票代號", "股票名稱", "產業", "持有股數", "佔比 (%)", "收藏"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.holdings.map((h, i) => (
              <tr key={h.stock_ticker} className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                <td className="px-4 py-3">
                  <Link href={`/stock/${h.stock_ticker}`} className="text-amber-500 hover:text-amber-600 font-bold">
                    {h.stock_ticker}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">{h.stock_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{h.industry ?? "N/A"}</td>
                <td className="px-4 py-3 text-gray-700 tabular-nums">{h.shares.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-800 font-semibold tabular-nums">{Number(h.weight_pct).toFixed(2)}%</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setStarred((prev) => {
                      const next = new Set(prev);
                      next.has(h.stock_ticker) ? next.delete(h.stock_ticker) : next.add(h.stock_ticker);
                      return next;
                    })}
                    className={`text-lg transition-colors ${starred.has(h.stock_ticker) ? "text-yellow-400" : "text-gray-200 hover:text-gray-400"}`}
                  >
                    ★
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChangesTab({ data }: { data: ETFChanges }) {
  if (!data.changes.length) {
    return <p className="text-gray-400 text-sm px-4 py-6">無異動資料</p>;
  }

  const added   = data.changes.filter((c) => c.change_type === "added" || c.change_type === "increased");
  const removed = data.changes.filter((c) => c.change_type === "removed" || c.change_type === "decreased");

  const Section = ({ title, items, accent }: { title: string; items: typeof data.changes; accent: string }) =>
    items.length ? (
      <div>
        <div className={`px-5 py-2.5 border-b border-gray-100 ${accent === "amber" ? "bg-amber-50" : "bg-red-50"}`}>
          <span className={`text-xs font-bold ${accent === "amber" ? "text-amber-500" : "text-red-500"}`}>{title}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["個股", "公司名稱", "類型", "前日股數", "今日股數", "差異", "金額 (億)"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const isPos = c.shares_delta > 0;
              return (
                <tr key={c.stock_ticker} className="border-b border-gray-50 hover:bg-amber-50/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/stock/${c.stock_ticker}`} className="text-amber-500 hover:text-amber-600 font-bold">{c.stock_ticker}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{c.stock_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPos ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
                      {CHANGE_LABEL[c.change_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">{c.shares_before.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">{c.shares_after.toLocaleString()}</td>
                  <td className={`px-4 py-3 font-bold tabular-nums ${isPos ? "text-amber-500" : "text-red-500"}`}>
                    {isPos ? "+" : ""}{c.shares_delta.toLocaleString()}
                  </td>
                  <td className={`px-4 py-3 tabular-nums ${isPos ? "text-amber-500" : "text-red-500"}`}>
                    {c.amount_billion != null ? `${isPos ? "+" : ""}${Number(c.amount_billion).toFixed(2)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : null;

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <Section title="新增 / 加碼" items={added} accent="amber" />
      <Section title="移除 / 減碼" items={removed} accent="red" />
    </div>
  );
}

type Tab = "basic" | "holdings" | "changes";

export default function ETFDetailTabs({
  etf,
  holdings,
  changes,
}: {
  etf: ETF;
  holdings: ETFHoldings;
  changes: ETFChanges | null;
}) {
  const [tab, setTab] = useState<Tab>("holdings");

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "basic", label: "基本資料" },
    { id: "holdings", label: "持股明細", count: holdings.count },
    { id: "changes", label: "持股變化", count: changes?.changes.length },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-amber-100 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors relative ${
              tab === t.id
                ? "text-amber-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab === t.id ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "basic" && <BasicTab etf={etf} />}
      {tab === "holdings" && <HoldingsTab data={holdings} />}
      {tab === "changes" && changes && <ChangesTab data={changes} />}
      {tab === "changes" && !changes && (
        <p className="text-gray-400 text-sm px-4 py-6">無異動資料</p>
      )}
    </div>
  );
}
