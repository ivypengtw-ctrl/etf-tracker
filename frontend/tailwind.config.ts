import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#111827",
        "surface-2": "#1e293b",
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
