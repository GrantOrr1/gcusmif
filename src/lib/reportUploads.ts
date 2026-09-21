import fs from "node:fs";
import path from "node:path";
import db from "./db";

export type ReportType = "equity_report" | "coverage_watchlist_report" | "financial_model";
export type ReportStatus = "pending" | "approved" | "declined";

export type ReportUpload = {
  id: number;
  title: string;
  reportType: ReportType;
  ticker: string | null;
  companyName: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  sector: string;
  uploadedBy: string;
  coAuthors: string[];
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type Row = {
  id: number;
  title: string;
  report_type: ReportType;
  ticker: string | null;
  company_name: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  sector: string;
  uploaded_by: string;
  co_authors: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function parseCoAuthors(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
  return [];
}

function fromRow(row: Row): ReportUpload {
  return {
    id: row.id,
    title: row.title,
    reportType: row.report_type,
    ticker: row.ticker,
    companyName: row.company_name,
    fileName: row.file_name,
    filePath: row.file_path,
    mimeType: row.mime_type,
    sector: row.sector,
    uploadedBy: row.uploaded_by,
    coAuthors: parseCoAuthors(row.co_authors),
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "data", "uploads");

/** Writes the file to the uploads dir and returns the stored (basename-only) file name. */
export function saveUploadedFile(fileName: string, buffer: Buffer): string {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, storedName), buffer);
  return storedName;
}

export function listReportUploads(): ReportUpload[] {
  const rows = db
    .prepare("SELECT * FROM report_uploads ORDER BY created_at DESC")
    .all() as Row[];
  return rows.map(fromRow);
}

export function listPendingForReviewer(opts: { isPortfolioManager: boolean; sector: string | null }): ReportUpload[] {
  const rows = db
    .prepare("SELECT * FROM report_uploads WHERE status = 'pending' ORDER BY created_at ASC")
    .all() as Row[];
  const pending = rows.map(fromRow);
  if (opts.isPortfolioManager) return pending;
  return pending.filter((r) => r.sector === opts.sector);
}

export function listApprovedReportsForTicker(ticker: string): ReportUpload[] {
  const rows = db
    .prepare(
      "SELECT * FROM report_uploads WHERE status = 'approved' AND ticker = ? ORDER BY reviewed_at DESC"
    )
    .all(ticker) as Row[];
  return rows.map(fromRow);
}

/** Approved reports where this person is the uploader OR a listed co-author. */
export function listApprovedReportsByUploader(name: string): ReportUpload[] {
  const rows = db
    .prepare("SELECT * FROM report_uploads WHERE status = 'approved' ORDER BY reviewed_at DESC")
    .all() as Row[];
  return rows.map(fromRow).filter((r) => r.uploadedBy === name || r.coAuthors.includes(name));
}

export function getReportUpload(id: number): ReportUpload | undefined {
  const row = db.prepare("SELECT * FROM report_uploads WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export function insertReportUpload(data: {
  title: string;
  reportType: ReportType;
  ticker: string | null;
  companyName: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  sector: string;
  uploadedBy: string;
  coAuthors?: string[];
  status: ReportStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}): ReportUpload {
  const result = db
    .prepare(
      `INSERT INTO report_uploads
        (title, report_type, ticker, company_name, file_name, file_path, mime_type, sector, uploaded_by, co_authors, status, reviewed_by, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.title,
      data.reportType,
      data.ticker,
      data.companyName,
      data.fileName,
      data.filePath,
      data.mimeType,
      data.sector,
      data.uploadedBy,
      data.coAuthors && data.coAuthors.length > 0 ? JSON.stringify(data.coAuthors) : null,
      data.status,
      data.reviewedBy ?? null,
      data.reviewedAt ?? null
    );

  return getReportUpload(Number(result.lastInsertRowid))!;
}

export function deleteReportUpload(id: number): void {
  const report = getReportUpload(id);
  if (!report) return;
  db.prepare("DELETE FROM report_uploads WHERE id = ?").run(id);
  const fullPath = path.join(/* turbopackIgnore: true */ UPLOADS_DIR, report.filePath);
  fs.rm(fullPath, { force: true }, () => {});
}

export function updateReportStatus(
  id: number,
  status: "approved" | "declined",
  reviewedBy: string
): ReportUpload | undefined {
  db.prepare(
    `UPDATE report_uploads SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
  ).run(status, reviewedBy, id);
  return getReportUpload(id);
}

export function updateReportTitle(id: number, title: string): ReportUpload | undefined {
  db.prepare("UPDATE report_uploads SET title = ? WHERE id = ?").run(title, id);
  return getReportUpload(id);
}
