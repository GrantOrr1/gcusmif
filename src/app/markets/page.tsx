import Link from "next/link";
import { auth } from "@/auth";
import { getTickerPerformance } from "@/lib/performance";
import EquityReturnChart from "@/components/equity/EquityReturnChart";
import SectorHeatmap from "@/components/markets/SectorHeatmap";

export const metadata = {
  title: "Markets | Student Managed Investment Fund",
};

const FEATURED_CHARTS = [
  { ticker: "^TNX", label: "10 Year Treasury", href: "/bond-markets", buttonLabel: "Open U.S. Bond Markets" },
  { ticker: "^GSPC", label: "S&P 500", href: "/equity-indices", buttonLabel: "Open Equity Indices" },
];

function RightArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function MarketsPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Markets</h1>
        <p className="mt-4 text-sm text-muted">
          This page is only available to logged-in analysts.
        </p>
      </div>
    );
  }

  const featuredData = await Promise.all(
    FEATURED_CHARTS.map((c) => getTickerPerformance(c.ticker, "ytd").catch(() => undefined))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Markets</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          {FEATURED_CHARTS.map((c, i) => (
            <div key={c.ticker} className="flex flex-col gap-3">
              <EquityReturnChart
                ticker={c.ticker}
                label={c.label}
                mode="price"
                axisFontSize={22}
                initialRange="ytd"
                initialData={featuredData[i]}
                priceLayout="inline"
                expandable
              />
              <Link
                href={c.href}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted hover:border-brand hover:text-foreground"
              >
                {c.buttonLabel}
                <RightArrow />
              </Link>
            </div>
          ))}
        </div>

        <SectorHeatmap className="sm:col-span-1 lg:col-span-2" />
      </div>
    </div>
  );
}
