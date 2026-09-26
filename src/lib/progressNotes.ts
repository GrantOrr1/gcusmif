import db from "./db";

export type ProgressNote = {
  id: number;
  ticker: string;
  note: string;
  author: string;
  createdAt: string;
};

type Row = {
  id: number;
  ticker: string;
  note: string;
  author: string;
  created_at: string;
};

function fromRow(row: Row): ProgressNote {
  return {
    id: row.id,
    ticker: row.ticker,
    note: row.note,
    author: row.author,
    createdAt: row.created_at,
  };
}

/** Most recent first — this is a running log, not a single mutable field. */
export function listProgressNotes(ticker: string): ProgressNote[] {
  const rows = db
    .prepare("SELECT * FROM progress_notes WHERE ticker = ? ORDER BY created_at DESC, id DESC")
    .all(ticker) as Row[];
  return rows.map(fromRow);
}

export function addProgressNote(ticker: string, note: string, author: string): ProgressNote {
  const result = db
    .prepare("INSERT INTO progress_notes (ticker, note, author) VALUES (?, ?, ?)")
    .run(ticker, note, author);
  const row = db.prepare("SELECT * FROM progress_notes WHERE id = ?").get(result.lastInsertRowid) as Row;
  return fromRow(row);
}
