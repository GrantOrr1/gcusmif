import db from "./db";
import type { Rating } from "./ratings";

export type { Rating } from "./ratings";
export { RATINGS } from "./ratings";

export type CoverageAssignment = {
  ticker: string;
  sector: string;
  assignedTo: string[];
  rating: Rating | null;
  targetPrice: number | null;
  triggerPrice: number | null;
  updatedBy: string | null;
  updatedAt: string;
};

type Row = {
  ticker: string;
  sector: string;
  assigned_to: string | null;
  rating: string | null;
  target_price: number | null;
  trigger_price: number | null;
  updated_by: string | null;
  updated_at: string;
};

function parseAssignedTo(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
  return [];
}

function fromRow(row: Row): CoverageAssignment {
  return {
    ticker: row.ticker,
    sector: row.sector,
    assignedTo: parseAssignedTo(row.assigned_to),
    rating: (row.rating as Rating | null) ?? null,
    targetPrice: row.target_price,
    triggerPrice: row.trigger_price,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export function listCoverage(): CoverageAssignment[] {
  const rows = db.prepare("SELECT * FROM coverage_assignments").all() as Row[];
  return rows.map(fromRow);
}

export function getCoverageForTicker(ticker: string): CoverageAssignment | undefined {
  const row = db
    .prepare("SELECT * FROM coverage_assignments WHERE ticker = ?")
    .get(ticker) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export function listCoverageForPerson(name: string): CoverageAssignment[] {
  return listCoverage().filter((c) => c.assignedTo.includes(name));
}

export function setCoverageAssignment(data: {
  ticker: string;
  sector: string;
  assignedTo: string[];
  updatedBy: string;
}): CoverageAssignment {
  db.prepare(
    `INSERT INTO coverage_assignments (ticker, sector, assigned_to, updated_by, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(ticker) DO UPDATE SET
       sector = excluded.sector,
       assigned_to = excluded.assigned_to,
       updated_by = excluded.updated_by,
       updated_at = datetime('now')`
  ).run(data.ticker, data.sector, JSON.stringify(data.assignedTo), data.updatedBy);

  return getCoverageForTicker(data.ticker)!;
}

export function updateCoverageRating(data: {
  ticker: string;
  sector: string;
  rating: Rating | null;
  targetPrice: number | null;
  triggerPrice: number | null;
  updatedBy: string;
}): CoverageAssignment {
  db.prepare(
    `INSERT INTO coverage_assignments (ticker, sector, assigned_to, rating, target_price, trigger_price, updated_by, updated_at)
     VALUES (?, ?, '[]', ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(ticker) DO UPDATE SET
       rating = excluded.rating,
       target_price = excluded.target_price,
       trigger_price = excluded.trigger_price,
       updated_by = excluded.updated_by,
       updated_at = datetime('now')`
  ).run(data.ticker, data.sector, data.rating, data.targetPrice, data.triggerPrice, data.updatedBy);

  return getCoverageForTicker(data.ticker)!;
}
