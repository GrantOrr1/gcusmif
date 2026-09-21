import { getCategoryNews, getTopIndustryNews } from "@/lib/industryNews";
import { getTickerPerformance } from "@/lib/performance";
import IndustryNews from "@/components/portfolio/IndustryNews";
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
  const [chartData, top, market, us, global, eu, energy, healthcare] = await Promise.all([
    Promise.all(
      MARKET_CHARTS.map((c) => getTickerPerformance(c.ticker, "ytd").catch(() => undefined))
    ),
    getTopIndustryNews(10).catch(() => []),
    getCategoryNews("market", 8).catch(() => []),
    getCategoryNews("us", 8).catch(() => []),
    getCategoryNews("global", 8).catch(() => []),
    getCategoryNews("eu", 8).catch(() => []),
    getCategoryNews("energy", 8).catch(() => []),
    getCategoryNews("healthcare", 8).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="markets" className="scroll-mt-20 text-3xl font-bold text-foreground">
          Markets
        </h1>
        <a
          href="#news-aggregator"
          className="rounded-md border border-brand bg-brand px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-hover"
        >
          Jump to News Aggregator
        </a>
      </div>

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

      <div className="mt-14 flex flex-wrap items-center gap-3">
        <h1 id="news-aggregator" className="scroll-mt-20 text-3xl font-bold text-foreground">
          News Aggregator
        </h1>
        <a
          href="#markets"
          className="rounded-md border border-brand bg-brand px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-hover"
        >
          Jump to Markets
        </a>
      </div>

      <div className="grid sm:grid-cols-2 sm:gap-x-8">
        <IndustryNews title="Top News" items={top} emptyMessage="No headlines available right now." />
        <IndustryNews title="Market News" items={market} emptyMessage="No market headlines available right now." />
        <IndustryNews title="U.S. News" items={us} emptyMessage="No U.S. headlines available right now." />
        <IndustryNews title="Global News" items={global} emptyMessage="No global headlines available right now." />
        <IndustryNews title="Energy News" items={energy} emptyMessage="No energy headlines available right now." />
        <IndustryNews
          title="Healthcare News"
          items={healthcare}
          emptyMessage="No healthcare headlines available right now."
        />
        <IndustryNews title="EU News" items={eu} emptyMessage="No EU headlines available right now." />
      </div>
    </div>
  );
}
