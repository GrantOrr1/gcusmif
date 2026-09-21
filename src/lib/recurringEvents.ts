import db from "./db";

export type RecurringEvent = {
  id: number;
  weekday: number;
  startTime: string;
  endTime: string;
  title: string;
  description: string | null;
  color: string;
  updatedBy: string | null;
  updatedAt: string;
};

type Row = {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  title: string;
  description: string | null;
  color: string;
  updated_by: string | null;
  updated_at: string;
};

function fromRow(row: Row): RecurringEvent {
  return {
    id: row.id,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    title: row.title,
    description: row.description,
    color: row.color,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export function listRecurringEvents(): RecurringEvent[] {
  const rows = db.prepare("SELECT * FROM recurring_events ORDER BY weekday ASC").all() as Row[];
  return rows.map(fromRow);
}

export function getRecurringEvent(id: number): RecurringEvent | undefined {
  const row = db.prepare("SELECT * FROM recurring_events WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export type RecurringException = { recurringEventId: number; date: string };

/** Every skipped single-week occurrence, across all recurring events. */
export function listRecurringExceptions(): RecurringException[] {
  const rows = db.prepare("SELECT recurring_event_id, date FROM recurring_event_exceptions").all() as {
    recurring_event_id: number;
    date: string;
  }[];
  return rows.map((r) => ({ recurringEventId: r.recurring_event_id, date: r.date }));
}

/** Skips a single week's occurrence of a recurring event without touching the standing weekly rule. */
export function addRecurringException(recurringEventId: number, date: string, createdBy: string): void {
  db.prepare(
    `INSERT INTO recurring_event_exceptions (recurring_event_id, date, created_by)
     VALUES (?, ?, ?)
     ON CONFLICT(recurring_event_id, date) DO NOTHING`
  ).run(recurringEventId, date, createdBy);
}

export function updateRecurringEventTime(
  id: number,
  startTime: string,
  endTime: string,
  updatedBy: string
): RecurringEvent | undefined {
  db.prepare(
    `UPDATE recurring_events SET start_time = ?, end_time = ?, updated_by = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(startTime, endTime, updatedBy, id);
  return getRecurringEvent(id);
}
