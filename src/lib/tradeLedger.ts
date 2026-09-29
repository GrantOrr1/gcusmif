import db from "./db";

export type TradeSide = "buy" | "sell";

export type TradeRecord = {
  id: number;
  ticker: string;
  companyName: string | null;
  sector: string;
  side: TradeSide;
  quantity: number;
  price: number;
  tradedAt: string;
  enteredBy: string;
  createdAt: string;
};

type Row = {
  id: number;
  ticker: string;
  company_name: string | null;
  sector: string;
  side: TradeSide;
  quantity: number;
  price: number;
  traded_at: string;
  entered_by: string;
  created_at: string;
};

function fromRow(row: Row): TradeRecord {
  return {
    id: row.id,
    ticker: row.ticker,
    companyName: row.company_name,
    sector: row.sector,
    side: row.side,
    quantity: row.quantity,
    price: row.price,
    tradedAt: row.traded_at,
    enteredBy: row.entered_by,
    createdAt: row.created_at,
  };
}

/** Most recent trade first, by when it actually happened (not when it was logged). */
export function listTradesForTicker(ticker: string): TradeRecord[] {
  const rows = db
    .prepare("SELECT * FROM trade_log WHERE ticker = ? ORDER BY traded_at DESC, id DESC")
    .all(ticker) as Row[];
  return rows.map(fromRow);
}

export function listAllTrades(): TradeRecord[] {
  const rows = db.prepare("SELECT * FROM trade_log ORDER BY traded_at DESC, id DESC").all() as Row[];
  return rows.map(fromRow);
}

export function addTrade(input: {
  ticker: string;
  companyName: string | null;
  sector: string;
  side: TradeSide;
  quantity: number;
  price: number;
  tradedAt: string;
  enteredBy: string;
}): TradeRecord {
  const result = db
    .prepare(
      `INSERT INTO trade_log (ticker, company_name, sector, side, quantity, price, traded_at, entered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.ticker,
      input.companyName,
      input.sector,
      input.side,
      input.quantity,
      input.price,
      input.tradedAt,
      input.enteredBy
    );
  const row = db.prepare("SELECT * FROM trade_log WHERE id = ?").get(result.lastInsertRowid) as Row;
  return fromRow(row);
}

export function deleteTrade(id: number): void {
  db.prepare("DELETE FROM trade_log WHERE id = ?").run(id);
}
