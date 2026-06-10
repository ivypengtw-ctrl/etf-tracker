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
