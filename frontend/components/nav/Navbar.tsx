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
    <nav className="sticky top-0 z-10 bg-amber-500 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white font-black text-sm">E</span>
            <span className="text-white font-bold text-base tracking-tight">ETF 持股分析</span>
          </Link>
          <div className="flex items-center gap-5 text-sm text-amber-100">
            <Link href="/" className="hover:text-white transition-colors">首頁</Link>
            <Link href="/stocks" className="hover:text-white transition-colors font-medium">個股分析</Link>
            <Link href="/funds" className="hover:text-white transition-colors font-medium">基金分析</Link>
            <Link href="/common" className="hover:text-white transition-colors font-medium">共同持股分析</Link>
            <Link href="/weekly" className="hover:text-white transition-colors font-medium">週報 · 經理人動向</Link>
            <Link href="/analysis" className="hover:text-white transition-colors">每日市場分析</Link>
            <Link href="/alerts" className="hover:text-white transition-colors">警報設定</Link>
          </div>
        </div>
        <form onSubmit={handleSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋 ETF、個股、經理人..."
            className="w-60 rounded-full bg-white/20 border border-white/30 px-4 py-1.5 text-sm text-white placeholder:text-amber-100 outline-none focus:bg-white/30 transition-all"
          />
        </form>
      </div>
    </nav>
  );
}
