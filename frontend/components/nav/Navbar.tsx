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
      <div className="flex items-center gap-6">
        <Link href="/" className="text-base font-bold text-white">
          ETF<span className="text-sky-400">異動</span>
        </Link>
        <Link href="/alerts" className="text-xs text-slate-500 hover:text-slate-200">警報設定</Link>
      </div>
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
