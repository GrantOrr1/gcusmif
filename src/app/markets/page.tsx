import { auth } from "@/auth";
import { getTickerPerformance } from "@/lib/performance";
import EquityReturnChart from "@/components/equity/EquityReturnChart";

export const metadata = {
  title: "Markets | Student Managed Investment Fund",
};

const MARKET_CHARTS = [
  { ticker: "^GSPC", label: "S&P 500" },
  { ticker: "^DJI", label: "DJIA" },
  { ticker: "^IXIC", label: "NASDAQ" },
  { ticker: "^RUT", label: "Russell 2000" },
  { ticker: "BZ=F", label: "Brent Crude Futures" },
  { ticker: "CL=F", label: "WTI Futures" },
  { ticker: "^FVX", label: "5 Year Treasury" },
  { ticker: "^TNX", label: "10 Year Treasury" },
  { ticker: "^TYX", label: "30 Year Treasury" },
];

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

  const chartData = await Promise.all(
    MARKET_CHARTS.map((c) => getTickerPerformance(c.ticker, "ytd").catch(() => undefined))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Markets</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MARKET_CHARTS.map((c, i) => (
          <EquityReturnChart
            key={c.ticker}
            ticker={c.ticker}
            label={c.label}
            mode="price"
            axisFontSize={22}
            initialRange="ytd"
            initialData={chartData[i]}
          />
        ))}
      </div>
    </div>
  );
}
