# Taiwan ETF Tracker — Plan 3: Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Next.js 14 frontend — home page with update bar, summary stats, cross-ETF rankings, full ETF table, plus ETF detail, manager profile, stock info, and alert subscription pages — all in the dark theme approved in design.

**Architecture:** Next.js App Router with Server Components for data-fetching pages and Client Components only for interactive elements (search, chart, alert form). API calls go to the FastAPI backend via a thin `lib/api.ts` client. No client-side state management library needed.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Recharts (charts), shadcn/ui (table + form components)

**Prerequisites:** Plan 1 backend must be running and accessible at `NEXT_PUBLIC_API_URL`.

---

## File Map

```
frontend/
├── package.json
├── tailwind.config.ts
├── next.config.ts
├── .env.local.example
├── app/
│   ├── layout.tsx               # root layout: dark bg, nav
│   ├── page.tsx                 # home page (Server Component)
│   ├── etf/[code]/
│   │   └── page.tsx             # ETF detail page
│   ├── manager/[id]/
│   │   └── page.tsx             # manager profile page
│   ├── stock/[ticker]/
│   │   └── page.tsx             # stock company page
│   └── alerts/
│       └── page.tsx             # alert subscription page
├── components/
│   ├── nav/
│   │   └── Navbar.tsx
│   ├── home/
│   │   ├── UpdateBar.tsx        # progress + summary text
│   │   ├── StatsCards.tsx       # total buy/sell billion
│   │   ├── CrossETFRankings.tsx # 4-column ranking grid
│   │   └── ETFTable.tsx         # searchable/filterable table (Client)
│   ├── etf/
│   │   ├── HoldingsList.tsx
│   │   └── HoldingsChart.tsx    # Recharts line chart (Client)
│   ├── manager/
│   │   └── ManagerProfile.tsx
│   ├── stock/
│   │   └── StockInfo.tsx
│   └── alerts/
│       └── AlertForm.tsx        # Client Component
└── lib/
    ├── api.ts                   # typed fetch wrappers
    └── types.ts                 # TypeScript interfaces matching backend schemas
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/next.config.ts`
- Create: `frontend/.env.local.example`

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@14 frontend \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd frontend
```

- [ ] **Step 2: Install additional dependencies**

```bash
npm install recharts
npx shadcn-ui@latest init
npx shadcn-ui@latest add table input button badge
```

Accept defaults for shadcn (dark mode, CSS variables).

- [ ] **Step 3: Create `.env.local.example`**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Copy to `.env.local` and fill in your backend URL.

- [ ] **Step 4: Update `tailwind.config.ts`** to use dark theme defaults:

```typescript
import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#111827",
        "surface-2": "#1e293b",
        border: "#1e293b",
        muted: "#475569",
        "muted-2": "#64748b",
        buy: "#4ade80",
        sell: "#f87171",
        accent: "#38bdf8",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Set dark mode in `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = { title: "ETF 異動追蹤" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className="dark">
      <body className={`${inter.className} bg-[#0b0f1a] text-slate-200 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:3000` loads a blank dark page with no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "chore: Next.js frontend bootstrap with Tailwind dark theme"
```

---

## Task 2: TypeScript Types + API Client

**Files:**
- Create: `frontend/lib/types.ts`
- Create: `frontend/lib/api.ts`

No tests for this task — types are verified by TypeScript compilation in subsequent tasks.

- [ ] **Step 1: Write `lib/types.ts`**

```typescript
export interface FundManager {
  id: string;
  name: string;
  education?: string;
  experience_years?: number;
  bio?: string;
  past_funds?: Array<{ name: string; period: string; return?: string }>;
}

export interface ETF {
  id: string;
  code: string;
  name: string;
  type: "stock" | "bond" | "other";
  fund_company: string;
  inception_date?: string;
  manager?: FundManager;
}

export interface HoldingsChange {
  stock_ticker: string;
  change_type: "added" | "removed" | "increased" | "decreased";
  shares_before: number;
  shares_after: number;
  shares_delta: number;
  amount_billion?: number;
}

export interface ETFChanges {
  etf: ETF;
  change_date: string;
  changes: HoldingsChange[];
}

export interface CrossETFItem {
  ticker: string;
  name?: string;
  etf_count: number;
  total_amount_billion?: number;
}

export interface TopETFItem {
  etf_code: string;
  etf_name: string;
  total_amount_billion?: number;
}

export interface DashboardSummary {
  date: string;
  total_buy_billion: number;
  total_sell_billion: number;
  etf_count_buy: number;
  etf_count_sell: number;
  updated_count: number;
  total_etf_count: number;
  summary_text: string;
  top_cross_buys: CrossETFItem[];
  top_cross_sells: CrossETFItem[];
  top_etfs_buy: TopETFItem[];
  top_etfs_sell: TopETFItem[];
}

export interface Stock {
  ticker: string;
  name: string;
  industry?: string;
  sub_industry?: string;
  founding_year?: number;
  main_business?: string;
  held_by: Array<{ etf_code: string; etf_name: string; weight_pct: number }>;
}
```

- [ ] **Step 2: Write `lib/api.ts`**

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getDashboardSummary(date?: string) {
  const q = date ? `?date=${date}` : "";
  return get<import("./types").DashboardSummary>(`/dashboard/summary${q}`);
}

export async function listETFs(search?: string, type?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (type) params.set("type", type);
  const q = params.size ? `?${params}` : "";
  return get<import("./types").ETF[]>(`/etfs${q}`);
}

export async function getETF(code: string) {
  return get<import("./types").ETF>(`/etfs/${code}`);
}

export async function getETFChanges(code: string, date?: string) {
  const q = date ? `?date=${date}` : "";
  return get<import("./types").ETFChanges>(`/etfs/${code}/changes${q}`);
}

export async function getManager(id: string) {
  return get<import("./types").FundManager>(`/managers/${id}`);
}

export async function getStock(ticker: string) {
  return get<import("./types").Stock>(`/stocks/${ticker}`);
}

export async function createAlert(payload: {
  channel: string;
  contact: string;
  etf_code?: string;
  threshold_pct?: number;
}) {
  const res = await fetch(`${BASE}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create alert failed: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/
git commit -m "feat: TypeScript types and API client"
```

---

## Task 3: Navbar + UpdateBar

**Files:**
- Create: `frontend/components/nav/Navbar.tsx`
- Create: `frontend/components/home/UpdateBar.tsx`

- [ ] **Step 1: Write `components/nav/Navbar.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/?search=${encodeURIComponent(query.trim())}`);
  }

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-[#0b0f1a]">
      <Link href="/" className="text-base font-bold text-white">
        ETF<span className="text-sky-400">異動</span>
      </Link>
      <form onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍  搜尋 ETF、個股、經理人..."
          className="w-56 rounded-md bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-slate-400 placeholder:text-slate-500 outline-none focus:border-sky-500"
        />
      </form>
    </nav>
  );
}
```

- [ ] **Step 2: Write `components/home/UpdateBar.tsx`**

```tsx
import type { DashboardSummary } from "@/lib/types";

export default function UpdateBar({ summary }: { summary: DashboardSummary }) {
  const pct = summary.total_etf_count
    ? Math.round((summary.updated_count / summary.total_etf_count) * 100)
    : 0;

  return (
    <div className="flex items-center gap-3 px-6 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-500">
      <span>資料更新</span>
      <div className="w-24 h-1 rounded-full bg-slate-800">
        <div className="h-1 rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-semibold text-sky-400">
        {summary.updated_count} / {summary.total_etf_count} 已更新
      </span>
      <span className="border-l border-slate-700 pl-3 flex-1">{summary.summary_text}</span>
    </div>
  );
}
```

- [ ] **Step 3: Add Navbar to root layout**

Update `app/layout.tsx`:

```tsx
import Navbar from "@/components/nav/Navbar";
// ...inside <body>:
<Navbar />
<main>{children}</main>
```

- [ ] **Step 4: Verify in browser at http://localhost:3000**

Expected: dark navbar with logo and search field.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/nav/ frontend/components/home/UpdateBar.tsx frontend/app/layout.tsx
git commit -m "feat: Navbar and UpdateBar components"
```

---

## Task 4: Home Page — Stats + Rankings

**Files:**
- Create: `frontend/components/home/StatsCards.tsx`
- Create: `frontend/components/home/CrossETFRankings.tsx`
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Write `components/home/StatsCards.tsx`**

```tsx
import type { DashboardSummary } from "@/lib/types";

export default function StatsCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="rounded-xl p-4 border border-green-900/30 bg-gradient-to-br from-green-950/40 to-green-950/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-1">今日全市場加碼</p>
        <p className="text-3xl font-extrabold text-green-400">+{summary.total_buy_billion.toFixed(1)} 億</p>
        <p className="text-xs text-slate-500 mt-1">共 {summary.etf_count_buy} 檔 ETF 有加碼</p>
      </div>
      <div className="rounded-xl p-4 border border-red-900/30 bg-gradient-to-br from-red-950/40 to-red-950/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-1">今日全市場減碼</p>
        <p className="text-3xl font-extrabold text-red-400">{summary.total_sell_billion.toFixed(1)} 億</p>
        <p className="text-xs text-slate-500 mt-1">共 {summary.etf_count_sell} 檔 ETF 有減碼</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/home/CrossETFRankings.tsx`**

```tsx
import type { DashboardSummary } from "@/lib/types";

function RankCard({
  title,
  items,
  positive,
}: {
  title: string;
  items: Array<{ ticker?: string; etf_code?: string; name?: string; etf_name?: string; etf_count?: number; total_amount_billion?: number }>;
  positive: boolean;
}) {
  const color = positive ? "text-green-400" : "text-red-400";
  const borderColor = positive ? "border-green-900/40" : "border-red-900/40";

  return (
    <div className={`bg-slate-900 border ${borderColor} rounded-xl p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${color} mb-3 pb-2 border-b border-slate-800`}>
        {title}
      </p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-900/50 last:border-0">
          <span className="text-xs text-slate-600 font-bold w-3">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${color}`}>{item.ticker ?? item.etf_code}</p>
            <p className="text-[10px] text-slate-500 truncate">{item.name ?? item.etf_name}</p>
          </div>
          <span className={`text-xs font-bold ${color}`}>
            {positive ? "+" : ""}{item.total_amount_billion?.toFixed(1)} 億
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CrossETFRankings({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <RankCard title="同步加碼 Top 3" items={summary.top_cross_buys} positive={true} />
      <RankCard title="同步減碼 Top 3" items={summary.top_cross_sells} positive={false} />
      <RankCard title="加碼最多 ETF Top 3" items={summary.top_etfs_buy} positive={true} />
      <RankCard title="減碼最多 ETF Top 3" items={summary.top_etfs_sell} positive={false} />
    </div>
  );
}
```

- [ ] **Step 3: Write `app/page.tsx`** (Server Component)

```tsx
import { getDashboardSummary, listETFs } from "@/lib/api";
import UpdateBar from "@/components/home/UpdateBar";
import StatsCards from "@/components/home/StatsCards";
import CrossETFRankings from "@/components/home/CrossETFRankings";
import ETFTable from "@/components/home/ETFTable";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { search?: string; type?: string };
}) {
  const [summary, etfs] = await Promise.all([
    getDashboardSummary(),
    listETFs(searchParams.search, searchParams.type),
  ]);

  return (
    <>
      <UpdateBar summary={summary} />
      <div className="max-w-7xl mx-auto px-6 py-5">
        <StatsCards summary={summary} />
        <CrossETFRankings summary={summary} />
        <ETFTable etfs={etfs} />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify page renders correctly at http://localhost:3000**

Expected: dark page with two stat cards and four ranking columns.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/home/StatsCards.tsx frontend/components/home/CrossETFRankings.tsx frontend/app/page.tsx
git commit -m "feat: home page stats cards and cross-ETF ranking grid"
```

---

## Task 5: ETF Table (Client Component)

**Files:**
- Create: `frontend/components/home/ETFTable.tsx`

- [ ] **Step 1: Write `components/home/ETFTable.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import type { ETF } from "@/lib/types";

type Filter = "all" | "buy" | "sell" | "stock" | "bond";

export default function ETFTable({ etfs }: { etfs: ETF[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const displayed = etfs.filter((e) => {
    const matchSearch =
      !search ||
      e.code.toLowerCase().includes(search.toLowerCase()) ||
      e.name.includes(search);
    const matchType =
      filter === "all" ||
      (filter === "stock" && e.type === "stock") ||
      (filter === "bond" && e.type === "bond");
    return matchSearch && matchType;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "buy", label: "只看加碼" },
    { key: "sell", label: "只看減碼" },
    { key: "stock", label: "股票型" },
    { key: "bond", label: "債券型" },
  ];

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <p className="text-sm font-semibold text-slate-200">所有 ETF 今日異動</p>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                filter === f.key
                  ? "bg-blue-700 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-950 text-slate-500">
            {["ETF 代碼", "名稱", "基金經理人", "新增", "刪除", "加碼 (億)", "減碼 (億)", ""].map((h) => (
              <th key={h} className="px-4 py-2 text-left font-medium border-b border-slate-800">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((etf) => (
            <tr key={etf.id} className="border-b border-slate-950 hover:bg-slate-800/20 transition-colors">
              <td className="px-4 py-2.5 font-semibold text-sky-400">{etf.code}</td>
              <td className="px-4 py-2.5 text-slate-200">{etf.name}</td>
              <td className="px-4 py-2.5">
                {etf.manager ? (
                  <Link
                    href={`/manager/${etf.manager.id}`}
                    className="text-slate-400 border-b border-dashed border-slate-600 hover:text-sky-400 hover:border-sky-400"
                  >
                    {etf.manager.name}
                  </Link>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
              {/* Placeholder columns — populated after changes API is integrated */}
              <td className="px-4 py-2.5 text-green-400">—</td>
              <td className="px-4 py-2.5 text-red-400">—</td>
              <td className="px-4 py-2.5 text-green-400">—</td>
              <td className="px-4 py-2.5 text-red-400">—</td>
              <td className="px-4 py-2.5">
                <Link
                  href={`/etf/${etf.code}`}
                  className="px-2 py-1 rounded border border-slate-700 text-slate-500 hover:border-sky-500 hover:text-sky-400 text-[10px]"
                >
                  明細 →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-4 px-4 py-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-600">
        <span>共 {etfs.length} 支 ETF</span>
        <span>資料來源：各投信公司官網</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify table renders with filter buttons and manager links**

```bash
# In browser, visit http://localhost:3000 — table should show with working filter buttons
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/home/ETFTable.tsx
git commit -m "feat: ETF table with client-side search and filter"
```

---

## Task 6: ETF Detail Page

**Files:**
- Create: `frontend/app/etf/[code]/page.tsx`
- Create: `frontend/components/etf/HoldingsList.tsx`
- Create: `frontend/components/etf/HoldingsChart.tsx`

- [ ] **Step 1: Write `components/etf/HoldingsList.tsx`**

```tsx
import type { HoldingsChange } from "@/lib/types";
import Link from "next/link";

export default function HoldingsList({ changes }: { changes: HoldingsChange[] }) {
  if (!changes.length) return <p className="text-slate-500 text-sm">今日無異動</p>;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-950 text-slate-500 border-b border-slate-800">
          {["個股", "異動類型", "前日張數", "今日張數", "差值", "金額 (億)"].map((h) => (
            <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {changes.map((c) => {
          const isPositive = c.shares_delta > 0;
          const typeLabel: Record<string, string> = {
            added: "新增", removed: "刪除", increased: "加碼", decreased: "減碼",
          };
          return (
            <tr key={c.stock_ticker} className="border-b border-slate-900 hover:bg-slate-800/20">
              <td className="px-4 py-2">
                <Link href={`/stock/${c.stock_ticker}`} className="text-sky-400 hover:underline">
                  {c.stock_ticker}
                </Link>
              </td>
              <td className={`px-4 py-2 font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {typeLabel[c.change_type]}
              </td>
              <td className="px-4 py-2 text-slate-400">{c.shares_before.toLocaleString()}</td>
              <td className="px-4 py-2 text-slate-400">{c.shares_after.toLocaleString()}</td>
              <td className={`px-4 py-2 font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{c.shares_delta.toLocaleString()}
              </td>
              <td className={`px-4 py-2 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {c.amount_billion != null
                  ? `${isPositive ? "+" : ""}${c.amount_billion.toFixed(2)}`
                  : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Write `components/etf/HoldingsChart.tsx`** (Client Component)

```tsx
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function HoldingsChart({
  data,
}: {
  data: Array<{ date: string; shares: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8 }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: "#38bdf8" }}
        />
        <Line type="monotone" dataKey="shares" stroke="#38bdf8" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Write `app/etf/[code]/page.tsx`**

```tsx
import { getETF, getETFChanges } from "@/lib/api";
import HoldingsList from "@/components/etf/HoldingsList";
import Link from "next/link";

export default async function ETFDetailPage({ params }: { params: { code: string } }) {
  const [etf, changesData] = await Promise.all([
    getETF(params.code),
    getETFChanges(params.code),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Header */}
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

      {/* Today's Changes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="font-semibold text-sm">今日成分股異動</p>
        </div>
        <HoldingsList changes={changesData.changes} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify page loads at `/etf/00981A`**

Expected: ETF header with name, fund company, manager link, and holdings table.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/etf/ frontend/components/etf/
git commit -m "feat: ETF detail page with holdings list and chart"
```

---

## Task 7: Manager Profile + Stock Info Pages

**Files:**
- Create: `frontend/app/manager/[id]/page.tsx`
- Create: `frontend/app/stock/[ticker]/page.tsx`

- [ ] **Step 1: Write `app/manager/[id]/page.tsx`**

```tsx
import { getManager } from "@/lib/api";

export default async function ManagerPage({ params }: { params: { id: string } }) {
  const manager = await getManager(params.id);

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-white mb-1">{manager.name}</h1>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {manager.education && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">學歷</p>
            <p className="text-sm text-slate-200">{manager.education}</p>
          </div>
        )}
        {manager.experience_years && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">年資</p>
            <p className="text-2xl font-bold text-sky-400">{manager.experience_years} 年</p>
          </div>
        )}
      </div>
      {manager.bio && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-4">
          <p className="text-xs text-slate-500 mb-2">簡介</p>
          <p className="text-sm text-slate-300 leading-relaxed">{manager.bio}</p>
        </div>
      )}
      {manager.past_funds && manager.past_funds.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-4">
          <p className="px-4 py-3 border-b border-slate-800 text-sm font-semibold">歷任基金</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-500">
                {["基金名稱", "任期", "績效"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left border-b border-slate-800">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {manager.past_funds.map((f, i) => (
                <tr key={i} className="border-b border-slate-900">
                  <td className="px-4 py-2 text-slate-200">{f.name}</td>
                  <td className="px-4 py-2 text-slate-400">{f.period}</td>
                  <td className="px-4 py-2 text-sky-400">{f.return ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `app/stock/[ticker]/page.tsx`**

```tsx
import { getStock } from "@/lib/api";
import Link from "next/link";

export default async function StockPage({ params }: { params: { ticker: string } }) {
  const stock = await getStock(params.ticker);

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
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/manager/ frontend/app/stock/
git commit -m "feat: manager profile and stock info pages"
```

---

## Task 8: Alert Subscription Page

**Files:**
- Create: `frontend/app/alerts/page.tsx`
- Create: `frontend/components/alerts/AlertForm.tsx`

- [ ] **Step 1: Write `components/alerts/AlertForm.tsx`** (Client Component)

```tsx
"use client";
import { useState } from "react";
import { createAlert } from "@/lib/api";

export default function AlertForm() {
  const [channel, setChannel] = useState<"email" | "line">("email");
  const [contact, setContact] = useState("");
  const [etfCode, setEtfCode] = useState("");
  const [threshold, setThreshold] = useState("1.0");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createAlert({
        channel,
        contact,
        etf_code: etfCode || undefined,
        threshold_pct: parseFloat(threshold),
      });
      setStatus("success");
      setContact("");
      setEtfCode("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 max-w-md">
      <h2 className="font-semibold text-white">設定異動警報</h2>

      <div>
        <p className="text-xs text-slate-500 mb-1.5">通知方式</p>
        <div className="flex gap-2">
          {(["email", "line"] as const).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setChannel(c)}
              className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                channel === c
                  ? "bg-blue-700 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {c === "email" ? "Email" : "LINE Notify"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">
          {channel === "email" ? "Email 地址" : "LINE Notify Token"}
        </label>
        <input
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={channel === "email" ? "your@email.com" : "LINE token..."}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">訂閱 ETF（留空 = 全部）</label>
        <input
          value={etfCode}
          onChange={(e) => setEtfCode(e.target.value)}
          placeholder="例如：00981A"
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">觸發門檻（億）</label>
        <input
          type="number"
          step="0.1"
          min="0.1"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-md py-2 text-sm font-semibold transition-colors"
      >
        訂閱
      </button>

      {status === "success" && <p className="text-green-400 text-xs">訂閱成功！</p>}
      {status === "error" && <p className="text-red-400 text-xs">訂閱失敗，請稍後再試。</p>}
    </form>
  );
}
```

- [ ] **Step 2: Write `app/alerts/page.tsx`**

```tsx
import AlertForm from "@/components/alerts/AlertForm";

export default function AlertsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <h1 className="text-xl font-bold text-white mb-2">異動警報</h1>
      <p className="text-sm text-slate-500 mb-6">
        設定後，當 ETF 單日加減碼超過門檻，系統會自動通知你。
      </p>
      <AlertForm />
    </div>
  );
}
```

- [ ] **Step 3: Add Alerts link to Navbar**

In `components/nav/Navbar.tsx`, add after the logo:

```tsx
import Link from "next/link";
// Inside the nav element, after the logo:
<Link href="/alerts" className="text-xs text-slate-500 hover:text-slate-200">警報設定</Link>
```

- [ ] **Step 4: Verify form submits at http://localhost:3000/alerts**

Expected: form renders, submission calls POST /alerts and shows "訂閱成功！".

- [ ] **Step 5: Commit**

```bash
git add frontend/app/alerts/ frontend/components/alerts/ frontend/components/nav/
git commit -m "feat: alert subscription page with Email and LINE Notify form"
```

---

## Task 9: Build Check + Vercel Deploy Config

- [ ] **Step 1: Run TypeScript compiler**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: build completes with no errors. Note any `Warning: Missing NEXT_PUBLIC_API_URL` — add it to Vercel env vars.

- [ ] **Step 3: Create `frontend/vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

- [ ] **Step 4: Final commit**

```bash
git add frontend/vercel.json
git commit -m "chore: Vercel deploy config and production build verified"
```

---

*All three plans complete. The backend (Plan 1) provides the API, scrapers (Plan 2) populate the database daily, and the frontend (Plan 3) displays the data.*
