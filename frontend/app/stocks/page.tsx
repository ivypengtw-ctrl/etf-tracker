"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTurnoverRanking } from "@/lib/api";
import type { TurnoverRanking, TurnoverStock } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const FAVORITES_KEY = "stock_favorites";
const MAX_FAVORITES = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  ticker: string;
  name: string;
  industry?: string;
}

// ─── Helper components ────────────────────────────────────────────────────────

function ChangeBadge({ pct }: { pct: number }) {
  const pos = pct >= 0;
  return (
    <span className={`tabular-nums font-semibold text-sm ${pos ? "text-amber-500" : "text-red-500"}`}>
      {pos ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

function ConsecutiveBadge({ days }: { days: number }) {
  const colors =
    days >= 5 ? "bg-amber-500 text-white" :
    days >= 3 ? "bg-amber-200 text-amber-800" :
    "bg-amber-50 text-amber-500";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${colors}`}>
      {days} 天
    </span>
  );
}

function StockRow({ s, index }: { s: TurnoverStock; index: number }) {
  return (
    <tr className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${index % 2 !== 0 ? "bg-gray-50/20" : ""}`}>
      <td className="px-4 py-3 text-gray-400 font-bold text-xs text-right w-10">{s.rank}</td>
      <td className="px-4 py-3">
        <Link href={`/stock/${s.stock_code}`} className="text-amber-500 hover:text-amber-600 font-bold">{s.stock_code}</Link>
      </td>
      <td className="px-4 py-3 text-gray-700 font-medium">{s.stock_name}</td>
      <td className="px-4 py-3 text-gray-800 tabular-nums font-semibold text-right">{s.turnover.toFixed(1)}</td>
      <td className="px-4 py-3 text-gray-700 tabular-nums text-right">{s.price.toLocaleString()}</td>
      <td className="px-4 py-3 text-right"><ChangeBadge pct={s.change_percent} /></td>
      <td className="px-4 py-3 text-center"><ConsecutiveBadge days={s.consecutive_days} /></td>
    </tr>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferMarket(ticker: string): string {
  if (/^\d{4,6}(L|S)?$/.test(ticker)) return "台灣證交所 (TWSE)";
  if (ticker.endsWith(" US")) return "美國 (NYSE / NASDAQ)";
  if (ticker.endsWith(" JP")) return "日本 (TSE)";
  if (ticker.endsWith(" KP") || ticker.endsWith(" KS")) return "韓國 (KRX)";
  if (ticker.endsWith(" GY")) return "德國 (Xetra)";
  if (ticker.endsWith(" FP")) return "法國 (Euronext)";
  if (ticker.endsWith(" CH")) return "中國 A 股";
  return "境外市場";
}

// ─── Search Tab ───────────────────────────────────────────────────────────────

function SearchTab() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [favorites, setFavorites] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      setFavorites(saved);
    } catch {}
  }, []);

  const saveFavorites = (list: SearchResult[]) => {
    setFavorites(list);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  };

  const addFavorite = (s: SearchResult) => {
    if (favorites.find((f) => f.ticker === s.ticker) || favorites.length >= MAX_FAVORITES) return;
    saveFavorites([...favorites, s]);
  };

  const removeFavorite = (ticker: string) => saveFavorites(favorites.filter((f) => f.ticker !== ticker));
  const isFav = (ticker: string) => favorites.some((f) => f.ticker === ticker);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${BASE}/stocks/search?q=${encodeURIComponent(query.trim())}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectResult = (s: SearchResult) => {
    setQuery(`${s.ticker}　${s.name}`);
    setSelected(s);
    setOpen(false);
  };

  const clearSelected = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected) { router.push(`/stock/${selected.ticker}`); return; }
    if (results.length > 0) selectResult(results[0]);
    else if (query.trim()) router.push(`/stock/${query.trim().toUpperCase()}`);
  };

  return (
    <div className="px-5 py-5 space-y-6">
      {/* Search bar */}
      <div className="bg-amber-50/40 rounded-2xl border border-amber-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-0.5">查詢股票</p>
        <p className="text-xs text-gray-400 mb-4">輸入股票代號或名稱，確認後直接查看個股詳情。</p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              onFocus={() => !selected && results.length > 0 && setOpen(true)}
              placeholder="股票代號或名稱，例如：2330、台積電"
              className="w-full rounded-xl border border-amber-200 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 bg-white transition pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={clearSelected}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none"
              >
                ×
              </button>
            )}
            {/* Dropdown */}
            {open && !selected && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-amber-100 shadow-lg z-20 overflow-hidden max-h-64 overflow-y-auto"
              >
                {results.map((s) => (
                  <button
                    key={s.ticker}
                    type="button"
                    onClick={() => selectResult(s)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-50 transition-colors text-left"
                  >
                    <div>
                      <span className="text-amber-500 font-bold text-sm mr-2">{s.ticker}</span>
                      <span className="text-gray-700 text-sm">{s.name}</span>
                    </div>
                    {s.industry && <span className="text-gray-400 text-xs">{s.industry}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            {searching
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
            }
            查詢股票
          </button>
        </form>

        {/* Selected stock card */}
        {selected && (
          <div className="mt-4 bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-2xl font-black text-gray-900">{selected.ticker}</p>
              <p className="text-base font-semibold text-amber-500 mt-0.5">{selected.name}</p>
            </div>
            <div className="space-y-1.5 mb-4">
              <div className="flex text-sm">
                <span className="text-gray-400 w-20 flex-shrink-0">市場別</span>
                <span className="text-gray-700 font-medium">{inferMarket(selected.ticker)}</span>
              </div>
              {selected.industry && (
                <div className="flex text-sm">
                  <span className="text-gray-400 w-20 flex-shrink-0">產業</span>
                  <span className="text-gray-700 font-medium">{selected.industry}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/stock/${selected.ticker}`)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors text-center"
              >
                確認查看
              </button>
              <button
                onClick={() => isFav(selected.ticker) ? removeFavorite(selected.ticker) : addFavorite(selected)}
                disabled={!isFav(selected.ticker) && favorites.length >= MAX_FAVORITES}
                className={`px-4 py-2.5 text-sm font-bold rounded-xl border transition-colors ${
                  isFav(selected.ticker)
                    ? "bg-yellow-50 border-yellow-200 text-yellow-600 hover:bg-yellow-100"
                    : favorites.length >= MAX_FAVORITES
                    ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-white border-amber-200 text-amber-500 hover:bg-amber-50"
                }`}
              >
                {isFav(selected.ticker) ? "★ 已收藏" : "☆ 收藏"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Favorites */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-600">
            我的最愛
            <span className="ml-1.5 text-xs text-gray-400 font-normal">（最多 {MAX_FAVORITES} 檔）</span>
          </h3>
          {favorites.length > 0 && <span className="text-xs text-gray-400">{favorites.length}/{MAX_FAVORITES}</span>}
        </div>
        {favorites.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-500">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            尚未收藏任何股票。查詢後點選「☆ 收藏」即可加入。
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {favorites.map((s) => (
              <div key={s.ticker} className="flex items-center justify-between bg-white rounded-xl border border-amber-100 px-3 py-2.5 gap-2">
                <button onClick={() => selectResult(s)} className="flex-1 min-w-0 text-left">
                  <span className="text-amber-500 font-bold text-sm">{s.ticker}</span>
                  <span className="text-gray-600 text-xs ml-1.5">{s.name}</span>
                </button>
                <button onClick={() => removeFavorite(s.ticker)} className="text-yellow-400 hover:text-gray-300 transition-colors text-base flex-shrink-0">★</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ranking Tab ──────────────────────────────────────────────────────────────

const TABLE_HEADERS = ["排名", "代號", "名稱", "成交量 (億)", "股價", "漲跌幅", "連續入榜"];

function RankingSection({ stocks, label }: { stocks: TurnoverStock[]; label: string }) {
  if (!stocks.length) return <p className="px-5 py-4 text-sm text-gray-400">{label}無資料</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-amber-50 border-b border-amber-100">
            {TABLE_HEADERS.map((h) => (
              <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap ${["排名", "成交量 (億)", "股價", "漲跌幅"].includes(h) ? "text-right" : h === "連續入榜" ? "text-center" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stocks.map((s, i) => <StockRow key={s.stock_code} s={s} index={i} />)}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "search" | "hot" | "all";

export default function StocksPage() {
  const [data, setData] = useState<TurnoverRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("search");

  useEffect(() => {
    getTurnoverRanking(50)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const allStocks = data
    ? [...data.hot_stocks, ...data.rankings].sort((a, b) => a.rank - b.rank)
    : [];
  const hotStocks = data?.hot_stocks ?? [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "search", label: "搜尋個股" },
    { id: "hot", label: `熱門強勢${hotStocks.length ? ` (${hotStocks.length})` : ""}` },
    { id: "all", label: `完整排行${data ? ` (${data.total_count})` : ""}` },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-amber-500 text-sm inline-flex items-center gap-1 mb-3">
          ← 返回首頁
        </Link>
        <h1 className="text-2xl font-black text-gray-800">
          個股分析
          {data && <span className="ml-2 text-sm font-normal text-gray-400">{data.trade_date}</span>}
        </h1>
        <p className="text-sm text-gray-400 mt-1">搜尋個股、查看 ETF 持股成交排行，收藏追蹤標的。</p>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-amber-100">
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
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "search" && <SearchTab />}

        {tab === "hot" && (
          loading
            ? <p className="px-5 py-6 text-sm text-gray-400">載入中…</p>
            : <RankingSection stocks={hotStocks.sort((a, b) => a.rank - b.rank)} label="熱門強勢" />
        )}

        {tab === "all" && (
          loading
            ? <p className="px-5 py-6 text-sm text-gray-400">載入中…</p>
            : <RankingSection stocks={allStocks} label="完整排行" />
        )}
      </div>
    </div>
  );
}
