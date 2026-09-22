import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// On Railway, mount a persistent volume at this directory (or set
// DATABASE_FILE to a path inside one) so edits survive redeploys — Railway's
// filesystem is otherwise rebuilt from source on every deploy.
const DB_PATH = process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "app.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Adds a column only if it's missing, and swallows "duplicate column name"
// errors caused by another concurrent worker winning the race and adding
// the column first.
function addColumnIfMissing(columns: string[], column: string, ddl: string) {
  if (!columns.includes(column)) {
    try {
      db.exec(ddl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("duplicate column name")) {
        throw err;
      }
    }
  }
}

// Next.js's build step ("next build") imports every route module from many
// parallel workers just to collect metadata — it never actually calls the
// route handlers or queries the database during that phase. Skip all schema
// setup while building so those workers don't all try to write to the same
// SQLite file at once and lock each other out. This still runs normally the
// first time the real server process starts.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (!isBuildPhase) {
  // Allow workers to wait for a lock to clear instead of failing immediately with
  // SQLITE_BUSY.
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA journal_mode = WAL;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS profile_overrides (
      slug TEXT PRIMARY KEY,
      bio TEXT,
      linkedin_url TEXT,
      watchlist TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS watchlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      company_name TEXT,
      sector TEXT NOT NULL,
      assigned_to TEXT,
      target_price REAL,
      trigger_price REAL,
      added_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS report_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      report_type TEXT NOT NULL,
      ticker TEXT,
      company_name TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      sector TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      person_name TEXT NOT NULL,
      sector TEXT NOT NULL,
      status TEXT NOT NULL,
      marked_by TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, person_name)
    );

    CREATE TABLE IF NOT EXISTS coverage_assignments (
      ticker TEXT PRIMARY KEY,
      sector TEXT NOT NULL,
      assigned_to TEXT,
      rating TEXT,
      target_price REAL,
      trigger_price REAL,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recurring_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekday INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recurring_event_exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurring_event_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(recurring_event_id, date)
    );

    CREATE TABLE IF NOT EXISTS site_pages (
      slug TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_links (
      platform TEXT PRIMARY KEY,
      url TEXT,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rating_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      ticker TEXT NOT NULL,
      sector TEXT NOT NULL,
      rating TEXT,
      target_price REAL,
      trigger_price REAL,
      submitted_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const reportUploadColumns = (db.prepare("PRAGMA table_info(report_uploads)").all() as { name: string }[]).map(
    (c) => c.name
  );
  addColumnIfMissing(reportUploadColumns, "ticker", "ALTER TABLE report_uploads ADD COLUMN ticker TEXT");
  addColumnIfMissing(reportUploadColumns, "company_name", "ALTER TABLE report_uploads ADD COLUMN company_name TEXT");
  addColumnIfMissing(reportUploadColumns, "co_authors", "ALTER TABLE report_uploads ADD COLUMN co_authors TEXT");

  const watchlistColumns = (db.prepare("PRAGMA table_info(watchlist_items)").all() as { name: string }[]).map(
    (c) => c.name
  );
  addColumnIfMissing(watchlistColumns, "target_price", "ALTER TABLE watchlist_items ADD COLUMN target_price REAL");
  addColumnIfMissing(watchlistColumns, "trigger_price", "ALTER TABLE watchlist_items ADD COLUMN trigger_price REAL");
  addColumnIfMissing(watchlistColumns, "rating", "ALTER TABLE watchlist_items ADD COLUMN rating TEXT");

  const profileOverrideColumns = (
    db.prepare("PRAGMA table_info(profile_overrides)").all() as { name: string }[]
  ).map((c) => c.name);
  addColumnIfMissing(profileOverrideColumns, "photo_file", "ALTER TABLE profile_overrides ADD COLUMN photo_file TEXT");
  addColumnIfMissing(profileOverrideColumns, "email", "ALTER TABLE profile_overrides ADD COLUMN email TEXT");

  const calendarEventColumns = (
    db.prepare("PRAGMA table_info(calendar_events)").all() as { name: string }[]
  ).map((c) => c.name);
  addColumnIfMissing(calendarEventColumns, "start_time", "ALTER TABLE calendar_events ADD COLUMN start_time TEXT");
  addColumnIfMissing(calendarEventColumns, "end_time", "ALTER TABLE calendar_events ADD COLUMN end_time TEXT");
  addColumnIfMissing(calendarEventColumns, "ticker", "ALTER TABLE calendar_events ADD COLUMN ticker TEXT");

  const recurringEventCount = (
    db.prepare("SELECT COUNT(*) as count FROM recurring_events").get() as { count: number }
  ).count;
  if (recurringEventCount === 0) {
    const RECURRING_PURPLE = "#7c3aed";
    db.prepare(
      `INSERT INTO recurring_events (weekday, start_time, end_time, title, description, color)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(1, "13:00", "14:45", "SMIF Class", null, RECURRING_PURPLE);
    db.prepare(
      `INSERT INTO recurring_events (weekday, start_time, end_time, title, description, color)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(6, "09:00", "11:00", "SMIF Meeting", null, RECURRING_PURPLE);
  }
}

export default db;
