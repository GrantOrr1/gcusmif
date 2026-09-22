import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuote, getQuoteSummaryDetails, getNoticeHeadlines } from "@/lib/yahoo";
import { getPortfolioData } from "@/lib/portfolio";
import { getTickerPerformance } from "@/lib/performance";
import { sectorByCode } from "@/lib/sectors";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPrice,
} from "@/lib/format";
import { ratingTone } from "@/lib/ratings";
import EquityReturnChart from "@/components/equity/EquityReturnChart";
import { EpsDotPlot, RevenueEarningsChart, EbitdaRevenueChart } from "@/components/equity/EarningsCharts";
import KpiCard from "@/components/portfolio/KpiCard";
import { listApprovedReportsForTicker } from "@/lib/reportUploads";
import { getCoverageForTicker } from "@/lib/coverageStore";
import { getCoveringPeopleForTicker } from "@/lib/tickerCoverage";
import { getWatchlistItemForTicker } from "@/lib/watchlistStore";
import { getUpcomingEarningsCallForTicker } from "@/lib/calendarStore";
import { TEAM } from "@/data/team";
import { slugifyName } from "@/lib/team";
import Avatar from "@/components/team/Avatar";
import AssigneeList from "@/components/team/AssigneeList";
import ReportsHeightSync from "@/components/equity/ReportsHeightSync";

const TYPE_LABELS: Record<string, string> = {
  equity_report: "Equity Report",
  coverage_watchlist_report: "Watchlist Report",
  financial_model: "Financial Model",
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function EquityPage({ params }: PageProps<"/equity/[ticker]">) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  const [quote, portfolio, ytdSeries, notices, summary] = await Promise.all([
    getQuote(ticker),
    getPortfolioData(),
    getTickerPerformance(ticker, "ytd"),
    getNoticeHeadlines(ticker).catch(() => []),
    getQuoteSummaryDetails(ticker).catch(() => null),
  ]);

  if (!quote) notFound();

  const holding = portfolio.holdings.find((h) => h.ticker === ticker);
  const ytdHolding = portfolio.ytdHoldings.find((h) => h.ticker === ticker);
  const gainSinceBought =
    holding?.totalValue != null && holding?.totalValuePaid != null
      ? holding.totalValue - holding.totalValuePaid
      : null;
  const reports = listApprovedReportsForTicker(ticker).sort((a, b) =>
    (b.reviewedAt ?? b.createdAt).localeCompare(a.reviewedAt ?? a.createdAt)
  );
  const sectorInfo = holding?.sector ? sectorByCode(holding.sector) : undefined;
  const coverage = getCoverageForTicker(ticker);
  const watchlistItem = getWatchlistItemForTicker(ticker);
  const ratingSource = holding
    ? { rating: coverage?.rating ?? null, targetPrice: coverage?.targetPrice ?? null, triggerPrice: coverage?.triggerPrice ?? null }
    : { rating: watchlistItem?.rating ?? null, targetPrice: watchlistItem?.targetPrice ?? null, triggerPrice: watchlistItem?.triggerPrice ?? null };
  const coverageTeam = getCoveringPeopleForTicker(ticker)
    .map((name) => TEAM.find((m) => m.name === name))
    .filter((m): m is (typeof TEAM)[number] => !!m);
  const upcomingEarningsCall = getUpcomingEarningsCallForTicker(ticker);
  const coveringTitle = (coverage?.assignedTo.length ?? 0) > 0 ? "Coverage Team" : "Watching";
  const edgarFilingsUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(ticker)}&type=&dateb=&owner=include&count=40`;

  const up = (quote.change ?? 0) >= 0;

  return (
    <div id="top" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <ReportsHeightSync />
      <Link
        href={sectorInfo ? `/portfolio/${sectorInfo.slug}` : "/portfolio"}
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to {sectorInfo ? sectorInfo.label : "Portfolio"}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{quote.symbol}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted">
              {quote.longName ?? quote.shortName} · {quote.exchangeName}
            </p>
            <a
              href={edgarFilingsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
            >
              Open Filings
            </a>
            {(holding || watchlistItem) && (
              <a
                href="#smif-rating"
                className="rounded-md border border-brand bg-brand px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-hover"
              >
                {holding ? "Jump to Position" : "Jump to Rating"}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-start gap-4">
          {upcomingEarningsCall && (
            <Link
              href="/calendar"
              className="rounded-md border border-negative/40 px-3 py-1.5 text-right hover:bg-negative/10"
            >
              <p className="text-xs font-semibold text-negative">Upcoming Earnings Call</p>
              <p className="text-xs text-muted">
                {new Date(`${upcomingEarningsCall.date}T00:00:00`).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </Link>
          )}
          <div className="text-right">
            <p className="text-3xl font-bold text-foreground">
              {formatPrice(quote.regularMarketPrice)}
            </p>
            <p className={`text-sm font-medium ${up ? "text-positive" : "text-negative"}`}>
              {quote.change !== null ? formatPrice(quote.change) : "—"} (
              {formatPercent(quote.changePercent)})
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <EquityReturnChart ticker={ticker} initialRange="ytd" initialData={ytdSeries} />
      </div>

      {notices.length > 0 && (
        <div className="mt-6 rounded-lg border border-brand bg-brand/10 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand">
              News
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 overflow-y-auto" style={{ maxHeight: 72 }}>
              {notices.map((n) => (
                <a
                  key={`${n.link}-${n.publishedAt}`}
                  href={n.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded px-1 hover:bg-brand/10"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground hover:underline">
                    {n.title}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">
                    {n.publisher ? `${n.publisher} · ` : ""}
                    {new Date(n.publishedAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Equity Summary</h2>
        <div className="grid gap-x-8 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
          <dl>
            <SummaryRow
              label="Previous Close"
              value={formatPrice(summary?.previousClose ?? quote.previousClose)}
            />
            <SummaryRow label="Open" value={formatPrice(summary?.open ?? null)} />
            <SummaryRow
              label="Day's Range"
              value={`${formatPrice(summary?.dayLow ?? quote.dayLow)} - ${formatPrice(summary?.dayHigh ?? quote.dayHigh)}`}
            />
            <SummaryRow
              label="52 Week Range"
              value={`${formatPrice(summary?.fiftyTwoWeekLow ?? quote.fiftyTwoWeekLow)} - ${formatPrice(summary?.fiftyTwoWeekHigh ?? quote.fiftyTwoWeekHigh)}`}
            />
            <SummaryRow label="Volume" value={formatNumber(summary?.volume ?? quote.volume)} />
            <SummaryRow label="Avg. Volume" value={formatNumber(summary?.averageVolume ?? null)} />
          </dl>
          <dl>
            <SummaryRow
              label="Market Cap (intraday)"
              value={formatCompactCurrency(summary?.marketCap ?? quote.marketCap)}
            />
            <SummaryRow
              label="Beta (5Y Monthly)"
              value={summary?.beta != null ? summary.beta.toFixed(2) : "—"}
            />
            <SummaryRow
              label="PE Ratio (TTM)"
              value={summary?.trailingPE != null ? summary.trailingPE.toFixed(2) : "—"}
            />
            <SummaryRow
              label="EPS (TTM)"
              value={summary?.trailingEps != null ? summary.trailingEps.toFixed(2) : "—"}
            />
            <SummaryRow
              label="Earnings Date"
              value={summary?.earningsDate ? new Date(summary.earningsDate).toLocaleDateString() : "—"}
            />
            <SummaryRow
              label="Forward Dividend & Yield"
              value={
                summary?.dividendRate != null
                  ? `${summary.dividendRate.toFixed(2)} (${formatPercent(summary.dividendYield, 2)})`
                  : "—"
              }
            />
            <SummaryRow label="1y Target Est" value={formatPrice(summary?.targetMeanPrice ?? null)} />
          </dl>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Earnings Trends</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              EPS — Last {summary?.earningsQuarters.length ?? 0} Quarters
            </p>
            <EpsDotPlot points={summary?.earningsQuarters ?? []} />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Revenue vs. Earnings</p>
            <RevenueEarningsChart points={summary?.earningsQuarters ?? []} />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              EBITDA &amp; Revenue — Last {summary?.earningsQuarters.length ?? 0} Quarters
            </p>
            <EbitdaRevenueChart points={summary?.earningsQuarters ?? []} />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Recent Quarter Snapshot</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiCard
                compact
                label="Operating Margin"
                value={formatPercent(summary?.operatingMarginRecentQuarter ?? null)}
              />
              <KpiCard
                compact
                label="Net Margin"
                value={formatPercent(summary?.netMarginRecentQuarter ?? null)}
              />
              <KpiCard
                compact
                label="Revenue Growth (YoY)"
                value={formatPercent(summary?.revenueGrowth ?? null)}
              />
              <KpiCard
                compact
                label="Current Ratio"
                value={summary?.currentRatio != null ? summary.currentRatio.toFixed(2) : "—"}
              />
              <KpiCard
                compact
                label="Debt / Equity"
                value={summary?.debtToEquity != null ? summary.debtToEquity.toFixed(2) : "—"}
              />
              <KpiCard compact label="Operating NWC" value={formatCompactCurrency(summary?.operatingNWC ?? null)} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Statistics</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex h-full flex-col">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Valuation Measures</h3>
            <div className="rounded-lg border border-border bg-surface p-4">
              <dl>
                <SummaryRow
                  label="Market Cap (intraday)"
                  value={formatCompactCurrency(summary?.marketCap ?? quote.marketCap)}
                />
                <SummaryRow
                  label="Enterprise Value"
                  value={formatCompactCurrency(summary?.enterpriseValue ?? null)}
                />
                <SummaryRow
                  label="Trailing P/E"
                  value={summary?.trailingPE != null ? summary.trailingPE.toFixed(2) : "—"}
                />
                <SummaryRow
                  label="Forward P/E"
                  value={summary?.forwardPE != null ? summary.forwardPE.toFixed(2) : "—"}
                />
                <SummaryRow
                  label="PEG Ratio (5yr expected)"
                  value={summary?.pegRatio != null ? summary.pegRatio.toFixed(2) : "—"}
                />
                <SummaryRow
                  label="Price/Sales (ttm)"
                  value={
                    summary?.priceToSalesTrailing12Months != null
                      ? summary.priceToSalesTrailing12Months.toFixed(2)
                      : "—"
                  }
                />
                <SummaryRow
                  label="Price/Book (mrq)"
                  value={summary?.priceToBook != null ? summary.priceToBook.toFixed(2) : "—"}
                />
                <SummaryRow
                  label="Enterprise Value/Revenue"
                  value={summary?.enterpriseToRevenue != null ? summary.enterpriseToRevenue.toFixed(2) : "—"}
                />
                <SummaryRow
                  label="Enterprise Value/EBITDA"
                  value={summary?.enterpriseToEbitda != null ? summary.enterpriseToEbitda.toFixed(2) : "—"}
                />
              </dl>
            </div>

            <div className="mt-6 flex flex-1 flex-col gap-6">
              {(holding || watchlistItem) && (
                <div id="smif-rating" className="shrink-0 scroll-mt-20">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">SMIF Rating</h3>
                  <div className="flex flex-col gap-3">
                    <KpiCard
                      compact
                      label="Rating"
                      value={ratingSource.rating ?? "—"}
                      tone={ratingTone(ratingSource.rating)}
                    />
                    <KpiCard
                      compact
                      label="12M Target Price"
                      value={formatPrice(ratingSource.targetPrice)}
                    />
                    <KpiCard
                      compact
                      label="Trigger Sell Price"
                      value={formatPrice(ratingSource.triggerPrice)}
                    />
                  </div>
                </div>
              )}

              <div
                id="reports"
                className="flex min-h-0 flex-1 scroll-mt-20 flex-col rounded-lg border border-border bg-surface p-3"
              >
                <p className="mb-2 shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
                  Reports
                </p>
                {reports.length > 0 ? (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {reports.map((report) => {
                      return (
                        <div
                          key={report.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-2 hover:border-brand"
                        >
                          <a
                            href={`/api/reports/file/${report.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="min-w-0 flex-1"
                          >
                            <p className="truncate text-sm font-medium text-foreground">{report.title}</p>
                            <p className="text-xs text-muted">
                              {TYPE_LABELS[report.reportType] ?? report.reportType} ·{" "}
                              {report.reportType === "financial_model" ? "Download" : "View"}
                            </p>
                          </a>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <AssigneeList
                              names={[report.uploadedBy, ...report.coAuthors]}
                              avatarSize={18}
                            />
                            <p className="whitespace-nowrap text-xs text-muted">
                              Published{" "}
                              {new Date(report.reviewedAt ?? report.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No reports uploaded for this equity yet.</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Financial Highlights</h3>
              <a
                href={edgarFilingsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
              >
                Open Filings
              </a>
            </div>
            <div id="financial-highlights-box" className="rounded-lg border border-border bg-surface p-4">
              <dl>
                <SummaryRow
                  label="Fiscal Year Ends"
                  value={
                    summary?.lastFiscalYearEnd
                      ? new Date(summary.lastFiscalYearEnd).toLocaleDateString()
                      : "—"
                  }
                />
                <SummaryRow
                  label="Most Recent Quarter (mrq)"
                  value={
                    summary?.mostRecentQuarter
                      ? new Date(summary.mostRecentQuarter).toLocaleDateString()
                      : "—"
                  }
                />
                <SummaryRow label="Profit Margin" value={formatPercent(summary?.profitMargins, 2)} />
                <SummaryRow
                  label="Operating Margin (ttm)"
                  value={formatPercent(summary?.operatingMargins, 2)}
                />
                <SummaryRow
                  label="Return on Assets (ttm)"
                  value={formatPercent(summary?.returnOnAssets, 2)}
                />
                <SummaryRow
                  label="Return on Equity (ttm)"
                  value={formatPercent(summary?.returnOnEquity, 2)}
                />
                <SummaryRow label="Revenue (ttm)" value={formatCompactCurrency(summary?.totalRevenue ?? null)} />
                <SummaryRow
                  label="Revenue Per Share (ttm)"
                  value={formatPrice(summary?.revenuePerShare ?? null)}
                />
                <SummaryRow
                  label="Quarterly Revenue Growth (yoy)"
                  value={formatPercent(summary?.revenueGrowth, 2)}
                />
                <SummaryRow label="Gross Profit (ttm)" value={formatCompactCurrency(summary?.grossProfits ?? null)} />
                <SummaryRow label="EBITDA" value={formatCompactCurrency(summary?.ebitda ?? null)} />
                <SummaryRow
                  label="Net Income Avi to Common (ttm)"
                  value={formatCompactCurrency(summary?.netIncomeToCommon ?? null)}
                />
                <SummaryRow
                  label="Diluted EPS (ttm)"
                  value={summary?.trailingEps != null ? summary.trailingEps.toFixed(2) : "—"}
                />
                <SummaryRow
                  label="Quarterly Earnings Growth (yoy)"
                  value={formatPercent(summary?.earningsGrowth, 2)}
                />
                <SummaryRow label="Total Cash (mrq)" value={formatCompactCurrency(summary?.totalCash ?? null)} />
                <SummaryRow
                  label="Total Cash Per Share (mrq)"
                  value={formatPrice(summary?.totalCashPerShare ?? null)}
                />
                <SummaryRow label="Total Debt (mrq)" value={formatCompactCurrency(summary?.totalDebt ?? null)} />
                <SummaryRow
                  label="Total Debt/Equity (mrq)"
                  value={summary?.debtToEquity != null ? summary.debtToEquity.toFixed(2) : "—"}
                />
                <SummaryRow
                  label="Current Ratio (mrq)"
                  value={summary?.currentRatio != null ? summary.currentRatio.toFixed(2) : "—"}
                />
                <SummaryRow
                  label="Book Value Per Share (mrq)"
                  value={formatPrice(summary?.bookValue ?? null)}
                />
                <SummaryRow
                  label="Operating Cash Flow (ttm)"
                  value={formatCompactCurrency(summary?.operatingCashflow ?? null)}
                />
                <SummaryRow
                  label="Levered Free Cash Flow (ttm)"
                  value={formatCompactCurrency(summary?.freeCashflow ?? null)}
                />
              </dl>
            </div>
          </div>
        </div>
      </div>

      {holding && (
        <div className="mt-10">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">SMIF Position</h2>
            <a
              href="#top"
              className="rounded-md border border-brand bg-brand px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-hover"
            >
              Jump to Top
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <KpiCard compact label="Sector" value={holding.sector ?? "—"} />
            <KpiCard compact label="Shares" value={formatNumber(holding.quantity)} />
            <KpiCard compact label="Value" value={formatCurrency(holding.totalValue)} />
            <KpiCard compact label="Average Cost" value={formatPrice(holding.pricePaid)} />
            <KpiCard compact label="Jan 1 Price" value={formatPrice(ytdHolding?.priceJan1 ?? null)} />
            <KpiCard
              compact
              label="Gain Since Bought ($)"
              value={formatCurrency(gainSinceBought)}
              tone={
                gainSinceBought === null ? "neutral" : gainSinceBought >= 0 ? "positive" : "negative"
              }
            />
            <KpiCard
              compact
              label="Return Since Purchase"
              value={formatPercent(holding.percentChange)}
              tone={
                holding.percentChange === null
                  ? "neutral"
                  : holding.percentChange >= 0
                    ? "positive"
                    : "negative"
              }
            />
          </div>
        </div>
      )}

      {coverageTeam.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">{coveringTitle}</h2>
            <a
              href="#top"
              className="rounded-md border border-brand bg-brand px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-hover"
            >
              Jump to Top
            </a>
          </div>
          <div className="flex flex-wrap gap-4">
            {coverageTeam.map((m) => (
              <Link
                key={m.name}
                href={`/team/${slugifyName(m.name)}`}
                className="flex w-28 shrink-0 flex-col items-center rounded-lg border border-border bg-surface p-4 text-center hover:border-brand"
              >
                <Avatar name={m.name} photoUrl={m.photoUrl} size={64} />
                <p className="mt-2 text-sm font-semibold text-foreground">{m.name}</p>
                <p className="text-xs text-muted">{m.role}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
