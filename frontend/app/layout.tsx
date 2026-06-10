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
