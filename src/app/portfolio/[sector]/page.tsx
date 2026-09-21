import Link from "next/link";
import { notFound } from "next/navigation";
import { sectorBySlug, SECTOR_INFO } from "@/lib/sectors";
import { getPortfolioData } from "@/lib/portfolio";
import { getPortfolioPerformance, dailyReturnFor, weeklyReturnFor } from "@/lib/performance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { TEAM } from "@/data/team";
import { slugifyName } from "@/lib/team";
import KpiCard from "@/components/portfolio/KpiCard";
import HoldingsTable from "@/components/portfolio/HoldingsTable";
import SectorPerformanceChart from "@/components/portfolio/SectorPerformanceChart";
import Avatar from "@/components/team/Avatar";

export default async function SectorPage({ params }: PageProps<"/portfolio/[sector]">) {
  const { sector: slug } = await params;
  const sectorInfo = sectorBySlug(slug);
  if (!sectorInfo) notFound();

  const sectorHead = TEAM.find(
    (m) => m.role.includes("Sector Head") && m.sector === sectorInfo.label
  );

  const data = await getPortfolioData();
  const holdings = data.holdings.filter((h) => h.sector === sectorInfo.code);

  const totalValue = holdings.reduce((sum, h) => sum + (h.totalValue ?? 0), 0);
  const totalCost = holdings.reduce((sum, h) => sum + (h.totalValuePaid ?? 0), 0);
  const totalReturn = totalCost > 0 ? totalValue / totalCost - 1 : null;

  const [ytdSeries, fiveDaySeries] = await Promise.all([
    getPortfolioPerformance("ytd"),
    getPortfolioPerformance("5d"),
  ]);
  const dailyReturn = dailyReturnFor(fiveDaySeries, { sector: sectorInfo.code });
  const weeklyReturn = weeklyReturnFor(fiveDaySeries, { sector: sectorInfo.code });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">{sectorInfo.label}</h1>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href="/portfolio"
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
            >
              Overview
            </Link>
            {SECTOR_INFO.filter((s) => s.slug !== sectorInfo.slug).map((s) => (
              <Link
                key={s.slug}
                href={`/portfolio/${s.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">
          {holdings.length} holding{holdings.length === 1 ? "" : "s"} in this sector
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <SectorPerformanceChart
            sectorCode={sectorInfo.code}
            sectorLabel={sectorInfo.label}
            equities={holdings.map((h) => ({ ticker: h.ticker, companyName: h.companyName }))}
            initialRange="ytd"
            initialData={ytdSeries}
          />
        </div>

        <div className="flex flex-col">
          {sectorHead && (
            <Link
              href={`/team/${slugifyName(sectorHead.name)}`}
              className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-brand"
            >
              <Avatar name={sectorHead.name} photoUrl={sectorHead.photoUrl} size={48} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {sectorHead.name}
                </p>
                <p className="truncate text-xs text-muted">{sectorHead.role}</p>
              </div>
            </Link>
          )}

          <div className="flex flex-1 flex-col justify-between">
            <KpiCard compact label="Sector Value" value={formatCurrency(totalValue)} />
            <KpiCard
              compact
              label="Sector Return"
              value={formatPercent(totalReturn)}
              tone={totalReturn === null ? "neutral" : totalReturn >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              compact
              label="Daily Return"
              value={formatPercent(dailyReturn)}
              tone={dailyReturn === null ? "neutral" : dailyReturn >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              compact
              label="Weekly Return"
              value={formatPercent(weeklyReturn)}
              tone={
                weeklyReturn === null ? "neutral" : weeklyReturn >= 0 ? "positive" : "negative"
              }
            />
            <KpiCard compact label="Holdings" value={holdings.length.toString()} />
            <KpiCard compact label="Cost Basis" value={formatCurrency(totalCost)} />
          </div>
        </div>
      </div>

      <div className="mt-10">
        <HoldingsTable
          holdings={holdings}
          ytdReturns={ytdSeries.points.at(-1)?.holdings ?? {}}
          portfolioTotalValue={data.summary.totalValue}
        />
      </div>
    </div>
  );
}
