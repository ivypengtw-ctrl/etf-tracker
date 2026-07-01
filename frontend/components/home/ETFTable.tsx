"use client";
import { useState } from "react";
import Link from "next/link";
import type { ETF } from "@/lib/types";

function formatMarketCap(val: number | undefined | null): string | null {
  if (val == null) return null;
  const n = Number(val);
  if (n >= 10000) return `${(n / 10000).toFixed(2)} 兆`;
  return `${n.toFixed(1)} 億`;
}

function formatDate(d: string | undefined | null): string | null {
  if (!d) return null;
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

function TypeBadge({ type }: { type: ETF["type"] }) {
  if (type === "active")
    return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-600 rounded-sm leading-none">主動</span>;
  if (type === "bond")
    return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded-sm leading-none">債券</span>;
  return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-500 rounded-sm leading-none">被動</span>;
}

function ETFCard({ etf }: { etf: ETF }) {
  const added   = etf.today_summary?.added_count ?? 0;
  const removed = etf.today_summary?.removed_count ?? 0;
  const dateStr = formatDate(etf.today_summary?.last_change_date);
  const cap     = formatMarketCap(etf.market_cap_billion);
  const isActive = etf.type === "active";
  const managerDisplay = etf.manager?.name ?? `請以${etf.fund_company}最新公開資料為準`;

  return (
    <Link
      href={`/etf/${etf.code}`}
      className="flex items-center justify-between px-5 py-4 border-b border-gray-50 hover:bg-amber-50/40 transition-colors group"
    >
      {/* Left */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-base font-black ${isActive ? "text-amber-500" : "text-gray-700"}`}>
            {etf.code}
          </span>
          <TypeBadge type={etf.type} />
        </div>
        <p className="text-sm text-gray-800 font-medium truncate mb-1 pr-4">{etf.name}</p>
        <p className="text-xs text-gray-400 mb-2">
          {etf.fund_company}
          <span className="mx-1">·</span>
          {managerDisplay}
        </p>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className={`flex items-center gap-1 font-medium ${added > 0 ? "text-amber-500" : "text-gray-300"}`}>
            ↗ 新增/加碼 {added} 檔
          </span>
          <span className={`flex items-center gap-1 ${removed > 0 ? "text-gray-500" : "text-gray-300"}`}>
            ↘ 移除/減碼 {removed} 檔
          </span>
          {dateStr && <span className="text-gray-400">{dateStr}</span>}
        </div>
      </div>

      {/* Right: market cap + arrow */}
      <div className="flex items-center gap-3 ml-4 shrink-0">
        {cap && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400 mb-0.5">總市值</p>
            <p className="text-sm font-bold text-gray-700">{cap}</p>
          </div>
        )}
        <span className="text-gray-300 group-hover:text-amber-400 transition-colors text-xl leading-none">›</span>
      </div>
    </Link>
  );
}

function Section({ title, description, etfs }: { title: string; description: string; etfs: ETF[] }) {
  if (etfs.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-700">{title}</h2>
          <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">{etfs.length} 檔</span>
        </div>
        <span className="text-xs text-gray-400 hidden sm:block">{description}</span>
      </div>
      <div>{etfs.map(etf => <ETFCard key={etf.id} etf={etf} />)}</div>
    </div>
  );
}

export default function ETFTable({ etfs }: { etfs: ETF[] }) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? etfs.filter(e =>
        e.code.toLowerCase().includes(search.toLowerCase()) ||
        e.name.includes(search) ||
        (e.manager?.name ?? "").includes(search) ||
        e.fund_company.includes(search)
      )
    : etfs;

  const activeETFs  = filtered.filter(e => e.type === "active");
  const passiveETFs = filtered.filter(e => e.type !== "active");

  return (
    <div>
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋代碼 / 基金名稱 / 投信 / 經理人..."
          className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm text-gray-600 placeholder:text-gray-300 outline-none focus:border-amber-400 shadow-sm"
        />
      </div>
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
        <Section title="主動型 ETF" description="經理團隊主動選股，依總市值排序" etfs={activeETFs} />
        <Section title="被動指數型 ETF" description="追蹤指數或既定規則，依總市值排序" etfs={passiveETFs} />
        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">找不到符合的 ETF</div>
        )}
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-gray-400">
          共 {etfs.length} 支 ETF · 增減代表最新持股異動檔數
        </div>
      </div>
    </div>
  );
}
