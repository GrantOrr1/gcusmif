import Link from "next/link";
import { auth } from "@/auth";
import { getTickerPerformance } from "@/lib/performance";
import EquityReturnChart from "@/components/equity/EquityReturnChart";

export const metadata = {
  title: "Equity Indices | Student Managed Investment Fund",
};

const INDEX_CHARTS = [
  { ticker: "^GSPC", label: "S&P 500" },
  { ticker: "^DJI", label: "DJIA" },
  { ticker: "^IXIC", label: "NASDAQ Composite" },
  { ticker: "^RUT", label: "Russell 2000" },
  { ticker: "^FTSE", label: "FTSE 100" },
  { ticker: "^GDAXI", label: "DAX" },
  { ticker: "^N225", label: "Nikkei 225" },
  { ticker: "^HSI", label: "Hang Seng" },
  { ticker: "^FCHI", label: "CAC 40" },
];

export default async function EquityIndicesPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Equity Indices</h1>
        <p className="mt-4 text-sm text-muted">
          This page is only available to logged-in analysts.
        </p>
      </div>
    );
  }

  const chartData = await Promise.all(
    INDEX_CHARTS.map((c) => getTickerPerformance(c.ticker, "ytd").catch(() => undefined))
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

      <h1 className="mt-4 text-3xl font-bold text-foreground">Equity Indices</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INDEX_CHARTS.map((c, i) => (
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
