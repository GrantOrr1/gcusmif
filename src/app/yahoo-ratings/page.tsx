import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson } from "@/lib/team";
import { SECTOR_INFO } from "@/lib/sectors";
import { getTopRatedEquitiesForSector, getAnalystRatingDetail, type ScreenedEquity, type AnalystRatingDetail } from "@/lib/yahoo";
import YahooRatingsBoard from "@/components/yahoo-ratings/YahooRatingsBoard";

export const metadata = {
  title: "Yahoo Ratings | Student Managed Investment Fund",
};

// "AGN" (Industry Agnostic) has no Yahoo sector equivalent, so it's skipped —
// see the YAHOO_SECTOR_FILTERS comment in src/lib/yahoo.ts.
const RATED_SECTORS = SECTOR_INFO.filter((s) => s.code !== "AGN");

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export default async function YahooRatingsPage() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));

  if (!me || me.role === "Analyst") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Yahoo Ratings</h1>
        <p className="mt-4 text-sm text-muted">
          This page is only available to logged-in Senior Analysts, Sector Heads, and the
          Portfolio Manager.
        </p>
      </div>
    );
  }

  // Pull a larger candidate pool per sector than we need, since some will get
  // discarded below for having no recommendation or too few analyst opinions
  // backing it — the screener itself can't filter on either of those.
  const CANDIDATE_POOL_SIZE = 32;
  const TOP_N = 12;
  const MIN_ANALYST_OPINIONS = 9;

  const sectorCandidates = await Promise.all(
    RATED_SECTORS.map((sector) => getTopRatedEquitiesForSector(sector.code, CANDIDATE_POOL_SIZE).catch(() => []))
  );

  const allCandidates = sectorCandidates.flat();
  const candidateDetails = await mapWithConcurrency(allCandidates, 6, (equity) =>
    getAnalystRatingDetail(equity.symbol).catch(() => null)
  );
  const detailBySymbol = new Map(allCandidates.map((e, i) => [e.symbol, candidateDetails[i]]));

  function isQualified(equity: ScreenedEquity): boolean {
    const detail = detailBySymbol.get(equity.symbol);
    return (
      !!detail &&
      detail.recommendationKey !== null &&
      detail.recommendationKey !== "none" &&
      detail.numberOfAnalystOpinions !== null &&
      detail.numberOfAnalystOpinions >= MIN_ANALYST_OPINIONS
    );
  }

  const sectors = RATED_SECTORS.map((sector, i) => ({
    code: sector.code,
    label: sector.label,
    equities: sectorCandidates[i].filter(isQualified).slice(0, TOP_N),
  }));

  const details: Record<string, AnalystRatingDetail | null> = {};
  for (const [symbol, detail] of detailBySymbol) {
    details[symbol] = detail;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Yahoo Ratings</h1>
      <p className="mt-1 text-sm text-muted">
        The twelve highest-rated equities per sector, ranked by Yahoo Finance&apos;s average
        analyst rating. Equities with no analyst recommendation, fewer than 9 analyst
        opinions, or a market cap under $10B are excluded.
      </p>

      <YahooRatingsBoard sectors={sectors} details={details} />
    </div>
  );
}
