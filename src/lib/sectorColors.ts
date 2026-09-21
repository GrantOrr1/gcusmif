import { hashColor } from "./colorHash";

const SECTOR_OVERRIDES: Record<string, string> = {
  HC: "#ec4899", // pink
  TMT: "#22c55e", // green
  FIG: "#eab308", // yellow
  CONS: "#38bdf8", // light blue
};

export function colorForSector(sector: string): string {
  const override = SECTOR_OVERRIDES[sector.toUpperCase()];
  if (override) return override;
  return hashColor(sector);
}
