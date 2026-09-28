export type CompPeriod = {
  key: string; // "2026-Q3" (calendar quarter) or "2026" (calendar year) — matches CompPeriodFinancials.periodKey
  label: string; // "Q3 2026" or "2026"
  kind: "quarter" | "year";
};

const CATALOG_START_YEAR = 2020;

/**
 * Candidate periods for the Comp Sheet's period selector: every calendar
 * quarter and calendar year from 2020 through the current quarter/year,
 * most recent first.
 */
export function generateCompPeriods(referenceDate: Date = new Date()): CompPeriod[] {
  const periods: CompPeriod[] = [];
  const currentYear = referenceDate.getUTCFullYear();
  const currentQuarter = Math.floor(referenceDate.getUTCMonth() / 3) + 1;

  for (let year = currentYear; year >= CATALOG_START_YEAR; year--) {
    const maxQuarter = year === currentYear ? currentQuarter : 4;
    for (let quarter = maxQuarter; quarter >= 1; quarter--) {
      periods.push({ key: `${year}-Q${quarter}`, label: `Q${quarter} ${year}`, kind: "quarter" });
    }
  }

  for (let year = currentYear; year >= CATALOG_START_YEAR; year--) {
    periods.push({ key: `${year}`, label: `${year}`, kind: "year" });
  }

  return periods;
}

/** Sort value that orders quarters and years chronologically, oldest first. */
function periodSortValue(period: CompPeriod): number {
  if (period.kind === "year") return Number(period.key) * 10;
  const [year, quarter] = period.key.split("-Q");
  return Number(year) * 10 + Number(quarter);
}

/** Oldest-to-newest comparator for displaying selected periods left to right. */
export function compareCompPeriods(a: CompPeriod, b: CompPeriod): number {
  return periodSortValue(a) - periodSortValue(b);
}
