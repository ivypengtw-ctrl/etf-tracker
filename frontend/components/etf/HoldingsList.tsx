import type { HoldingsChange } from "@/lib/types";
import Link from "next/link";

export default function HoldingsList({ changes }: { changes: HoldingsChange[] }) {
  if (!changes.length) return <p className="text-slate-500 text-sm px-4 py-4">今日無異動</p>;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-950 text-slate-500 border-b border-slate-800">
          {["個股", "公司名稱", "異動類型", "前日張數", "今日張數", "差值", "金額 (億)"].map((h) => (
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
              <td className="px-4 py-2 text-slate-300">{c.stock_name ?? "—"}</td>
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
                  ? `${isPositive ? "+" : ""}${Number(c.amount_billion).toFixed(2)}`
                  : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
