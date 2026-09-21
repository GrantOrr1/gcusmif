import { auth } from "@/auth";
import { getPortfolioData } from "@/lib/portfolio";
import EquityResearch from "@/components/analyst/EquityResearch";

export default async function AnalystPage() {
  const session = await auth();
  const data = await getPortfolioData();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">
        Welcome, {session?.user?.name ?? "Analyst"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Look up price, chart, and key stats for any of the fund&apos;s current holdings.
      </p>

      <div className="mt-8">
        <EquityResearch
          holdings={data.holdings.map((h) => ({
            ticker: h.ticker,
            companyName: h.companyName,
          }))}
        />
      </div>
    </div>
  );
}
