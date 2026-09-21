import db from "./db";

export type AttendanceStatus = "present" | "excused" | "absent";

export type AttendanceRecord = {
  id: number;
  date: string;
  personName: string;
  sector: string;
  status: AttendanceStatus;
  markedBy: string;
  updatedAt: string;
};

type Row = {
  id: number;
  date: string;
  person_name: string;
  sector: string;
  status: AttendanceStatus;
  marked_by: string;
  updated_at: string;
};

function fromRow(row: Row): AttendanceRecord {
  return {
    id: row.id,
    date: row.date,
    personName: row.person_name,
    sector: row.sector,
    status: row.status,
    markedBy: row.marked_by,
    updatedAt: row.updated_at,
  };
}

/** Only Mondays (1) and Saturdays (6) are valid meeting/attendance days. */
export function isValidAttendanceDate(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 1 || day === 6;
}

export function listAttendanceForDate(date: string, sector: string): AttendanceRecord[] {
  const rows = db
    .prepare("SELECT * FROM attendance_records WHERE date = ? AND sector = ?")
    .all(date, sector) as Row[];
  return rows.map(fromRow);
}

/** Count of meetings attended (present or excused both count) per person, for a sector. */
export function countAttendanceBySector(sector: string): Record<string, number> {
  const rows = db
    .prepare(
      `SELECT person_name, COUNT(*) as cnt FROM attendance_records
       WHERE sector = ? AND status IN ('present', 'excused')
       GROUP BY person_name`
    )
    .all(sector) as { person_name: string; cnt: number }[];
  const map: Record<string, number> = {};
  for (const r of rows) map[r.person_name] = r.cnt;
  return map;
}

export function upsertAttendance(
  date: string,
  sector: string,
  markedBy: string,
  records: { name: string; status: AttendanceStatus }[]
): void {
  const stmt = db.prepare(`
    INSERT INTO attendance_records (date, person_name, sector, status, marked_by, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(date, person_name) DO UPDATE SET
      status = excluded.status,
      sector = excluded.sector,
      marked_by = excluded.marked_by,
      updated_at = datetime('now')
  `);
  for (const r of records) {
    stmt.run(date, r.name, sector, r.status, markedBy);
  }
}
