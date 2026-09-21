export type SectorInfo = {
  code: string;
  slug: string;
  label: string;
};

export const SECTOR_INFO: SectorInfo[] = [
  { code: "TMT", slug: "tmt", label: "TMT" },
  { code: "FIG", slug: "financials", label: "Financials" },
  { code: "HC", slug: "healthcare", label: "Healthcare" },
  { code: "CONS", slug: "consumer", label: "Consumer" },
  { code: "IND", slug: "industrials", label: "Industrials" },
  { code: "ENER", slug: "energy", label: "Energy" },
  { code: "AGN", slug: "agnostic", label: "Industry Agnostic" },
];

export function sectorBySlug(slug: string): SectorInfo | undefined {
  return SECTOR_INFO.find((s) => s.slug === slug);
}

export function sectorByCode(code: string): SectorInfo | undefined {
  return SECTOR_INFO.find((s) => s.code === code);
}

export function sectorByLabel(label: string): SectorInfo | undefined {
  return SECTOR_INFO.find((s) => s.label === label);
}

export const PORTFOLIO_BENCHMARK = { ticker: "^GSPC", label: "S&P 500" };

/** SPDR Select Sector ETFs used as each sector's benchmark, instead of the broad S&P 500. */
export const SECTOR_BENCHMARKS: Record<string, { ticker: string; label: string }> = {
  TMT: { ticker: "XLK", label: "XLK" },
  FIG: { ticker: "XLF", label: "XLF" },
  HC: { ticker: "XLV", label: "XLV" },
  CONS: { ticker: "XLY", label: "XLY" },
  IND: { ticker: "XLI", label: "XLI" },
  ENER: { ticker: "XLE", label: "XLE" },
  AGN: PORTFOLIO_BENCHMARK,
};

export function benchmarkForSector(code: string): { ticker: string; label: string } {
  return SECTOR_BENCHMARKS[code] ?? PORTFOLIO_BENCHMARK;
}
