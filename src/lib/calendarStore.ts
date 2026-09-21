import db from "./db";

export type CalendarEvent = {
  id: number;
  date: string;
  title: string;
  description: string | null;
  color: string;
  startTime: string | null;
  endTime: string | null;
  ticker: string | null;
  createdBy: string;
  createdAt: string;
};

type Row = {
  id: number;
  date: string;
  title: string;
  description: string | null;
  color: string;
  start_time: string | null;
  end_time: string | null;
  ticker: string | null;
  created_by: string;
  created_at: string;
};

function fromRow(row: Row): CalendarEvent {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    description: row.description,
    color: row.color,
    startTime: row.start_time,
    endTime: row.end_time,
    ticker: row.ticker,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function listCalendarEvents(): CalendarEvent[] {
  const rows = db.prepare("SELECT * FROM calendar_events ORDER BY date ASC").all() as Row[];
  return rows.map(fromRow);
}

export function getCalendarEvent(id: number): CalendarEvent | undefined {
  const row = db.prepare("SELECT * FROM calendar_events WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export function addCalendarEvent(data: {
  date: string;
  title: string;
  description: string | null;
  color: string;
  startTime: string | null;
  endTime: string | null;
  ticker: string | null;
  createdBy: string;
}): CalendarEvent {
  const result = db
    .prepare(
      `INSERT INTO calendar_events (date, title, description, color, start_time, end_time, ticker, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.date,
      data.title,
      data.description,
      data.color,
      data.startTime,
      data.endTime,
      data.ticker,
      data.createdBy
    );
  return getCalendarEvent(Number(result.lastInsertRowid))!;
}

export function deleteCalendarEvent(id: number): void {
  db.prepare("DELETE FROM calendar_events WHERE id = ?").run(id);
}
