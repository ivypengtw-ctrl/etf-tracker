"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Stock } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ETFEvent {
  etf_code: string;
  etf_name: string;
  change_type: string;
  shares_before: number;
  shares_after: number;
  shares_delta: number;
}

interface ChangeDate {
  date: string;
  events: ETFEvent[];
}

interface Holder {
  etf_code: string;
  etf_name: string;
  shares: number;
  weight_pct: number;
}

interface ETFActivity {
  ticker: string;
  snapshot_date: string | null;
  holder_count: number;
  holders: Holder[];
  change_dates: ChangeDate[];
}

interface SearchResult {
  ticker: string;
  name: string;
  industry?: string;
}

const CHANGE_LABEL: Record<string, string> = {
  added: "新增",
  increased: "加碼",
  decreased: "減碼",
  removed: "移除",
};

const CHANGE_COLOR: Record<string, string> = {
  added: "bg-amber-100 text-amber-600",
  increased: "bg-amber-50 text-amber-500",
  decreased: "bg-red-50 text-red-500",
  removed: "bg-red-100 text-red-600",
};

function inferMarket(ticker: string): string {
  if (/^\d{4,6}(A|L|S)?$/.test(ticker)) return "TWSE";
  if (ticker.endsWith(" US")) return "NYSE/NASDAQ";
  if (ticker.endsWith(" JP")) return "TSE";
  if (ticker.endsWith(" KP") || ticker.endsWith(" KS")) return "KRX";
  if (ticker.endsWith(" GY")) return "Xetra";
  if (ticker.endsWith(" FP")) return "Euronext";
  if (ticker.endsWith(" CH")) return "中國A股";
  return "境外市場";
}

function tvSymbol(ticker: string): string {
  if (/^\d{4,6}(A|L|S)?$/.test(ticker)) return `TWSE:${ticker}`;
  return ticker;
}

// ─── Search bar ────────────────────────────────────────────────────────────────

function SearchBar({ currentTicker: _currentTicker }: { currentTicker: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}/stocks/search?q=${encodeURIComponent(query.trim())}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 mb-5">
      <p className="text-xs font-semibold text-gray-500 mb-2">查詢股票</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={(e) => { if (e.key === "Enter" && results.length > 0) { router.push(`/stock/${results[0].ticker}`); setOpen(false); }}}
            placeholder="股票代號或名稱，例如：2330、台積電"
            className="w-full rounded-xl border border-amber-200 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 bg-white transition"
          />
          {open && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-amber-100 shadow-lg z-30 overflow-hidden max-h-56 overflow-y-auto">
              {results.map((s) => (
                <Link
                  key={s.ticker}
                  href={`/stock/${s.ticker}`}
                  onClick={() => { setOpen(false); setQuery(""); }}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-amber-50 transition-colors"
                >
                  <span>
                    <span className="text-amber-500 font-bold text-sm mr-2">{s.ticker}</span>
                    <span className="text-gray-700 text-sm">{s.name}</span>
                  </span>
                  {s.industry && <span className="text-gray-400 text-xs">{s.industry}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => { if (results.length > 0) { router.push(`/stock/${results[0].ticker}`); setOpen(false); }}}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          查詢股票
        </button>
      </div>
    </div>
  );
}

// ─── Chart links ─────────────────────────────────────────────────────────────

function ChartLinks({ ticker }: { ticker: string }) {
  const symbol = tvSymbol(ticker);
  const yahooTicker = ticker.replace(/\s+/g, "") + ".TW";
  const tvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
  const yahooUrl = `https://finance.yahoo.com/chart/${yahooTicker}`;

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-amber-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-700">技術分析圖表</h2>
          <p className="text-xs text-gray-400 mt-0.5">選擇外部平台開啟互動式 K 線圖</p>
        </div>
      </div>
      <div className="px-5 py-5 flex items-center gap-4">
        <a
          href={tvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-5 py-3 bg-[#2962FF] hover:bg-[#1a4fcc] text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0">
            <path d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 3L7 10h3v5h4v-5h3L12 5z"/>
          </svg>
          TradingView 開啟
        </a>
        <a
          href={yahooUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-5 py-3 bg-[#6001D2] hover:bg-[#4a00a8] text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18c0-.55-.45-1-1-1s-1 .45-1 1v1.93C7.06 19.44 4.56 16.94 4.07 14H6c.55 0 1-.45 1-1s-.45-1-1-1H4.07C4.56 8.06 7.06 5.56 10 5.07V7c0 .55.45 1 1 1s1-.45 1-1V5.07C15.94 5.56 18.44 8.06 18.93 11H17c-.55 0-1 .45-1 1s.45 1 1 1h1.93c-.49 2.94-2.99 5.44-5.93 5.93z"/>
          </svg>
          Yahoo Finance 開啟
        </a>
        <span className="text-xs text-gray-400">開啟 EMA / BB / MACD 等技術指標分析</span>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function StockDetailClient({ ticker }: { ticker: string }) {
  const [stock, setStock] = useState<Stock | null>(null);
  const [activity, setActivity] = useState<ETFActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"holders" | "changes">("holders");

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/stocks/${encodeURIComponent(ticker)}`).then((r) => r.ok ? r.json() : null),
      fetch(`${BASE}/stocks/${encodeURIComponent(ticker)}/etf-activity`).then((r) => r.ok ? r.json() : null),
    ]).then(([s, a]) => {
      setStock(s);
      setActivity(a);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-amber-50 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const market = inferMarket(ticker);
  const totalShares = activity?.holders.reduce((s, h) => s + h.shares, 0) ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
        <Link href="/" className="hover:text-amber-500 transition-colors">首頁</Link>
        <span>/</span>
        <Link href="/stocks" className="hover:text-amber-500 transition-colors">個股分析</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">{ticker}</span>
      </div>

      {/* Search */}
      <SearchBar currentTicker={ticker} />

      {/* Stock Hero */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-3xl font-black text-gray-900">{ticker}</p>
            <p className="text-xl font-bold text-amber-500 mt-0.5">{stock?.name ?? "—"}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="text-gray-400 text-xs">市場別</span>
                <span className="font-semibold text-gray-700">{market}</span>
              </span>
              {stock?.industry && (
                <>
                  <span className="text-gray-200">|</span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">主要產業</span>
                    <span className="font-semibold text-gray-700">{stock.industry}</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <Link
            href={`/stocks`}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors"
          >
            搜尋其他個股
          </Link>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: "主動 ETF 持有數", value: activity ? `${activity.holder_count} 檔` : "—" },
            { label: "ETF 總持股數 (張)", value: totalShares > 0 ? `${Math.floor(totalShares / 1000).toLocaleString()}` : "—" },
            { label: "最新快照日期", value: activity?.snapshot_date ?? "—" },
            { label: "歷史異動紀錄", value: activity ? `${activity.change_dates.length} 次` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-amber-50/50 rounded-xl p-3 border border-amber-100">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-base font-black text-gray-800">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TradingView Chart */}
      {/^\d{4,6}(A|L|S)?$/.test(ticker) && <ChartLinks ticker={ticker} />}

      {/* ETF Holdings & Activity */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-amber-100">
          {([
            ["holders", `主動式 ETF 持倉 (${activity?.holder_count ?? 0})`],
            ["changes", `每日買賣紀錄 (${activity?.change_dates.reduce((s, d) => s + d.events.length, 0) ?? 0} 筆)`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === id
                  ? "text-amber-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-500"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "holders" && (
          <div className="overflow-x-auto">
            {!activity?.holders.length ? (
              <p className="px-5 py-6 text-sm text-gray-400">目前無 ETF 持有此股票</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50 border-b border-amber-100">
                    {["ETF 代碼", "基金名稱", "持股數 (股)", "佔比 (%)"].map((h) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 ${h.includes("持") || h.includes("佔") ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activity.holders.map((h, i) => (
                    <tr key={h.etf_code} className={`border-b border-gray-50 hover:bg-amber-50/20 transition-colors ${i % 2 !== 0 ? "bg-gray-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <Link href={`/etf/${h.etf_code}`} className="text-amber-500 hover:text-amber-600 font-bold">{h.etf_code}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{h.etf_name}</td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums text-right">{h.shares.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-right text-gray-800">{h.weight_pct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "changes" && (
          <div>
            {!activity?.change_dates.length ? (
              <p className="px-5 py-6 text-sm text-gray-400">目前無 ETF 買賣紀錄</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {activity.change_dates.map((cd) => (
                  <div key={cd.date} className="px-5 py-4">
                    <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">{cd.date}</p>
                    <div className="space-y-2">
                      {cd.events.map((ev, i) => {
                        const isPos = ev.shares_delta >= 0;
                        return (
                          <div key={`${ev.etf_code}-${i}`} className="flex items-center gap-3">
                            <Link href={`/etf/${ev.etf_code}`} className="text-amber-500 hover:text-amber-600 font-bold text-xs w-20 flex-shrink-0">
                              {ev.etf_code}
                            </Link>
                            <span className="text-gray-600 text-xs flex-1 truncate">{ev.etf_name}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${CHANGE_COLOR[ev.change_type] ?? "bg-gray-100 text-gray-500"}`}>
                              {CHANGE_LABEL[ev.change_type] ?? ev.change_type}
                            </span>
                            <span className={`text-xs tabular-nums font-semibold flex-shrink-0 ${isPos ? "text-amber-500" : "text-red-500"}`}>
                              {isPos ? "+" : ""}{ev.shares_delta.toLocaleString()} 股
                            </span>
                            <span className="text-gray-400 text-xs tabular-nums flex-shrink-0">
                              → {ev.shares_after.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
