import Link from "next/link";
import { auth } from "@/auth";
import { getTickerPerformance } from "@/lib/performance";
import EquityReturnChart from "@/components/equity/EquityReturnChart";

export const metadata = {
  title: "U.S. Bond Markets | Student Managed Investment Fund",
};

// The 4 standard Treasury yield benchmarks Yahoo tracks, plus the 5 most
// liquid CME Treasury futures contracts, together span the government bond
// curve from 3 months out to 30+ years.
const BOND_CHARTS = [
  { ticker: "^IRX", label: "3 Month T-Bill" },
  { ticker: "^FVX", label: "5 Year Treasury Yield" },
  { ticker: "^TNX", label: "10 Year Treasury Yield" },
  { ticker: "^TYX", label: "30 Year Treasury Yield" },
  { ticker: "ZT=F", label: "2 Year T-Note Futures" },
  { ticker: "ZF=F", label: "5 Year T-Note Futures" },
  { ticker: "ZN=F", label: "10 Year T-Note Futures" },
  { ticker: "ZB=F", label: "30 Year T-Bond Futures" },
  { ticker: "UB=F", label: "Ultra T-Bond Futures" },
];

export default async function BondMarketsPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">U.S. Bond Markets</h1>
        <p className="mt-4 text-sm text-muted">
          This page is only available to logged-in analysts.
        </p>
      </div>
    );
  }

  const chartData = await Promise.all(
    BOND_CHARTS.map((c) => getTickerPerformance(c.ticker, "ytd").catch(() => undefined))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        href="/markets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 12H5M11 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Markets
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-foreground">U.S. Bond Markets</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BOND_CHARTS.map((c, i) => (
          <EquityReturnChart
            key={c.ticker}
            ticker={c.ticker}
            label={c.label}
            mode="price"
            axisFontSize={22}
            initialRange="ytd"
            initialData={chartData[i]}
            priceLayout="inline"
            expandable
          />
        ))}
      </div>
    </div>
  );
}
