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
