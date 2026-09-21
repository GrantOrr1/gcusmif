import db from "./db";
import type { Rating } from "./ratings";

export type WatchlistItem = {
  id: number;
  ticker: string;
  companyName: string | null;
  sector: string;
  assignedTo: string[];
  targetPrice: number | null;
  triggerPrice: number | null;
  rating: Rating | null;
  addedBy: string;
  createdAt: string;
};

type Row = {
  id: number;
  ticker: string;
  company_name: string | null;
  sector: string;
  assigned_to: string | null;
  target_price: number | null;
  trigger_price: number | null;
  rating: string | null;
  added_by: string;
  created_at: string;
};

function parseAssignedTo(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    // Legacy rows stored a single plain name string, not JSON.
    return [raw];
  }
  return [];
}

function fromRow(row: Row): WatchlistItem {
  return {
    id: row.id,
    ticker: row.ticker,
    companyName: row.company_name,
    sector: row.sector,
    assignedTo: parseAssignedTo(row.assigned_to),
    targetPrice: row.target_price,
    triggerPrice: row.trigger_price,
    rating: (row.rating as Rating | null) ?? null,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export function listWatchlist(): WatchlistItem[] {
  const rows = db
    .prepare("SELECT * FROM watchlist_items ORDER BY created_at DESC")
    .all() as Row[];
  return rows.map(fromRow);
}

export function getWatchlistItem(id: number): WatchlistItem | undefined {
  const row = db.prepare("SELECT * FROM watchlist_items WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export function updateWatchlistRating(
  id: number,
  data: { rating: Rating | null; targetPrice: number | null; triggerPrice: number | null }
): WatchlistItem | undefined {
  db.prepare(
    `UPDATE watchlist_items SET rating = ?, target_price = ?, trigger_price = ? WHERE id = ?`
  ).run(data.rating, data.targetPrice, data.triggerPrice, id);
  return getWatchlistItem(id);
}

export function listTickersAssignedTo(name: string): string[] {
  const rows = db.prepare("SELECT DISTINCT ticker, assigned_to FROM watchlist_items").all() as {
    ticker: string;
    assigned_to: string | null;
  }[];
  const tickers = new Set<string>();
  for (const r of rows) {
    if (parseAssignedTo(r.assigned_to).includes(name)) tickers.add(r.ticker);
  }
  return Array.from(tickers);
}

export function addWatchlistItem(data: {
  ticker: string;
  companyName: string | null;
  sector: string;
  assignedTo: string[];
  targetPrice: number | null;
  triggerPrice: number | null;
  addedBy: string;
}): WatchlistItem {
  const result = db
    .prepare(
      `INSERT INTO watchlist_items (ticker, company_name, sector, assigned_to, target_price, trigger_price, added_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.ticker,
      data.companyName,
      data.sector,
      JSON.stringify(data.assignedTo),
      data.targetPrice,
      data.triggerPrice,
      data.addedBy
    );

  const row = db
    .prepare("SELECT * FROM watchlist_items WHERE id = ?")
    .get(result.lastInsertRowid) as Row;
  return fromRow(row);
}
