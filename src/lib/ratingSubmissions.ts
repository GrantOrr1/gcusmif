import db from "./db";
import type { Rating } from "./ratings";

export type SubmissionTargetType = "watchlist" | "coverage";
export type SubmissionStatus = "pending" | "approved" | "declined";

export type RatingSubmission = {
  id: number;
  targetType: SubmissionTargetType;
  targetId: string;
  ticker: string;
  sector: string;
  rating: Rating | null;
  targetPrice: number | null;
  triggerPrice: number | null;
  submittedBy: string;
  status: SubmissionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type Row = {
  id: number;
  target_type: SubmissionTargetType;
  target_id: string;
  ticker: string;
  sector: string;
  rating: string | null;
  target_price: number | null;
  trigger_price: number | null;
  submitted_by: string;
  status: SubmissionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function fromRow(row: Row): RatingSubmission {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    ticker: row.ticker,
    sector: row.sector,
    rating: (row.rating as Rating | null) ?? null,
    targetPrice: row.target_price,
    triggerPrice: row.trigger_price,
    submittedBy: row.submitted_by,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export function getSubmission(id: number): RatingSubmission | undefined {
  const row = db.prepare("SELECT * FROM rating_submissions WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export function getPendingSubmission(
  targetType: SubmissionTargetType,
  targetId: string
): RatingSubmission | undefined {
  const row = db
    .prepare(
      "SELECT * FROM rating_submissions WHERE target_type = ? AND target_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
    )
    .get(targetType, targetId) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

/** All currently-pending submissions, keyed by `${targetType}:${targetId}`. */
export function listPendingByTarget(targetType: SubmissionTargetType): Map<string, RatingSubmission> {
  const rows = db
    .prepare("SELECT * FROM rating_submissions WHERE target_type = ? AND status = 'pending'")
    .all(targetType) as Row[];
  return new Map(rows.map((r) => [r.target_id, fromRow(r)]));
}

export function listPendingForReviewer(opts: {
  targetType: SubmissionTargetType;
  isPortfolioManager: boolean;
  sector: string | null;
}): RatingSubmission[] {
  const rows = db
    .prepare(
      "SELECT * FROM rating_submissions WHERE target_type = ? AND status = 'pending' ORDER BY created_at ASC"
    )
    .all(opts.targetType) as Row[];
  const pending = rows.map(fromRow);
  if (opts.isPortfolioManager) return pending;
  return pending.filter((r) => r.sector === opts.sector);
}

export function listMyPendingSubmissions(
  targetType: SubmissionTargetType,
  name: string
): RatingSubmission[] {
  const rows = db
    .prepare(
      "SELECT * FROM rating_submissions WHERE target_type = ? AND status = 'pending' AND submitted_by = ? ORDER BY created_at DESC"
    )
    .all(targetType, name) as Row[];
  return rows.map(fromRow);
}

/** Creates a new pending submission, replacing this target's existing pending one (if any). */
export function upsertPendingSubmission(data: {
  targetType: SubmissionTargetType;
  targetId: string;
  ticker: string;
  sector: string;
  rating: Rating | null;
  targetPrice: number | null;
  triggerPrice: number | null;
  submittedBy: string;
}): RatingSubmission {
  const existing = getPendingSubmission(data.targetType, data.targetId);
  if (existing) {
    db.prepare(
      `UPDATE rating_submissions SET rating = ?, target_price = ?, trigger_price = ?, submitted_by = ?, created_at = datetime('now')
       WHERE id = ?`
    ).run(data.rating, data.targetPrice, data.triggerPrice, data.submittedBy, existing.id);
    return getSubmission(existing.id)!;
  }

  const result = db
    .prepare(
      `INSERT INTO rating_submissions (target_type, target_id, ticker, sector, rating, target_price, trigger_price, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.targetType,
      data.targetId,
      data.ticker,
      data.sector,
      data.rating,
      data.targetPrice,
      data.triggerPrice,
      data.submittedBy
    );

  return getSubmission(Number(result.lastInsertRowid))!;
}

export function reviewSubmission(
  id: number,
  status: "approved" | "declined",
  reviewedBy: string
): RatingSubmission | undefined {
  db.prepare(
    `UPDATE rating_submissions SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
  ).run(status, reviewedBy, id);
  return getSubmission(id);
}

export function cancelSubmission(id: number): void {
  db.prepare("DELETE FROM rating_submissions WHERE id = ? AND status = 'pending'").run(id);
}
