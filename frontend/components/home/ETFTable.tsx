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
