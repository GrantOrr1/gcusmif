import Link from "next/link";
import { getPortfolioData } from "@/lib/portfolio";
import {
  getPortfolioPerformance,
  dailyReturnFromSeries,
  weeklyReturnFromSeries,
  weeklyReturnFor,
} from "@/lib/performance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { SECTOR_INFO } from "@/lib/sectors";
import { TEAM } from "@/data/team";
import { slugifyName } from "@/lib/team";
import KpiCard from "@/components/portfolio/KpiCard";
import SectorPerformancePanel from "@/components/portfolio/SectorPerformancePanel";
import SectorPieChart from "@/components/portfolio/SectorPieChart";
import HoldingsTable from "@/components/portfolio/HoldingsTable";
import PerformanceChart from "@/components/portfolio/PerformanceChart";
import TopMovers from "@/components/portfolio/TopMovers";
import Avatar from "@/components/team/Avatar";

export const metadata = {
  title: "Portfolio | Student Managed Investment Fund",
};

export default async function PortfolioPage() {
  const data = await getPortfolioData();
  const { summary, holdings, sectorAllocation, ytdPortfolioReturn } = data;

  const [ytdSeries, fiveDaySeries] = await Promise.all([
    getPortfolioPerformance("ytd"),
    getPortfolioPerformance("5d"),
  ]);
  const dailyReturn = dailyReturnFromSeries(fiveDaySeries);
  const weeklyReturn = weeklyReturnFromSeries(fiveDaySeries);
  const ytdReturn = ytdPortfolioReturn;
  const portfolioManager = TEAM.find((m) => m.role === "Portfolio Manager");

  const topMovers = holdings
    .map((h) => {
      const weeklyReturn = weeklyReturnFor(fiveDaySeries, { ticker: h.ticker });
      const priceChange =
        weeklyReturn !== null && h.currentPrice !== null
          ? h.currentPrice - h.currentPrice / (1 + weeklyReturn)
          : null;
      return {
        ticker: h.ticker,
        companyName: h.companyName,
        weeklyReturn,
        priceChange,
      };
    })
    .filter(
      (
        m
      ): m is {
        ticker: string;
        companyName: string | null;
        weeklyReturn: number;
        priceChange: number | null;
      } => m.weeklyReturn !== null
    )
    .sort((a, b) => Math.abs(b.weeklyReturn) - Math.abs(a.weeklyReturn))
    .slice(0, 5);

  // Sector Allocation's own order (by weight) is used as the canonical order
  // everywhere else on the page, so colors line up at a glance across charts.
  // Cash isn't a covered sector, so it's excluded from these two charts.
  const sectorOrder = sectorAllocation.map((s) => s.sector);
  const displaySectorAllocation = sectorAllocation.filter((s) => s.sector !== "CASH");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
          <div className="flex flex-wrap gap-1.5">
            {SECTOR_INFO.map((s) => (
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
        <p className="text-xs text-muted">
          Last updated {new Date(data.lastUpdated).toLocaleString()}
        </p>
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <PerformanceChart initialRange="ytd" initialData={ytdSeries} sectorOrder={sectorOrder} />
        </div>

        <div className="flex flex-col">
          {portfolioManager && (
            <Link
              href={`/team/${slugifyName(portfolioManager.name)}`}
              className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-brand"
            >
              <Avatar name={portfolioManager.name} photoUrl={portfolioManager.photoUrl} size={48} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {portfolioManager.name}
                </p>
                <p className="truncate text-xs text-muted">{portfolioManager.role}</p>
              </div>
            </Link>
          )}

          <div className="flex flex-1 flex-col justify-center gap-1.5">
            <KpiCard compact evenHeight={false} layout="row" label="Total Value" value={formatCurrency(summary.totalValue)} />
            <KpiCard
              compact
              evenHeight={false} layout="row"
              label="Total Return"
              value={formatPercent(summary.percentChange)}
              tone={
                summary.percentChange === null
                  ? "neutral"
                  : summary.percentChange >= 0
                    ? "positive"
                    : "negative"
              }
            />
            <KpiCard
              compact
              evenHeight={false} layout="row"
              label="Total Cost Basis"
              value={formatCurrency(summary.totalValuePaid)}
            />
            <KpiCard
              compact
              evenHeight={false} layout="row"
              label="Realized Gain"
              value={formatCurrency(summary.realizedGain)}
              tone={
                summary.realizedGain === null ? "neutral" : summary.realizedGain >= 0 ? "positive" : "negative"
              }
            />
            <KpiCard
              compact
              evenHeight={false} layout="row"
              label="Return Incl. Realized"
              value={formatPercent(summary.percentChangeInclRealized)}
              tone={
                summary.percentChangeInclRealized === null
                  ? "neutral"
                  : summary.percentChangeInclRealized >= 0
                    ? "positive"
                    : "negative"
              }
            />
            <KpiCard
              compact
              evenHeight={false} layout="row"
              label="Daily Return"
              value={formatPercent(dailyReturn)}
              tone={dailyReturn === null ? "neutral" : dailyReturn >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              compact
              evenHeight={false} layout="row"
              label="Weekly Return"
              value={formatPercent(weeklyReturn)}
              tone={
                weeklyReturn === null ? "neutral" : weeklyReturn >= 0 ? "positive" : "negative"
              }
            />
            <KpiCard
              compact
              evenHeight={false} layout="row"
              label="YTD Return"
              value={formatPercent(ytdReturn)}
              tone={ytdReturn === null ? "neutral" : ytdReturn >= 0 ? "positive" : "negative"}
            />
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Top Weekly Movers</h2>
          <div className="flex-1 rounded-lg border border-border bg-surface p-4">
            <TopMovers movers={topMovers} />
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Sector Performance</h2>
          <div className="flex flex-1 flex-col rounded-lg border border-border bg-surface p-4">
            <SectorPerformancePanel data={ytdSeries} sectorOrder={sectorOrder} />
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Sector Allocation
          </h2>
          <div className="flex flex-1 items-center rounded-lg border border-border bg-surface p-4">
            <SectorPieChart
              data={displaySectorAllocation.map((s) => ({
                sector: s.sector,
                value: s.percentOfPortfolio ?? 0,
              }))}
            />
          </div>
        </div>
      </div>

      <div className="mt-10">
        <HoldingsTable
          holdings={holdings}
          ytdReturns={ytdSeries.points.at(-1)?.holdings ?? {}}
          portfolioTotalValue={summary.totalValue}
        />
      </div>
    </div>
  );
}
