import { Suspense } from "react";
import StockDetailClient from "./StockDetailClient";

export default function StockPage({ params }: { params: { ticker: string } }) {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-amber-100 rounded-xl w-48" />
          <div className="h-40 bg-amber-50 rounded-2xl" />
        </div>
      </div>
    }>
      <StockDetailClient ticker={params.ticker} />
    </Suspense>
  );
}
