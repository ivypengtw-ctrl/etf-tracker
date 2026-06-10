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
