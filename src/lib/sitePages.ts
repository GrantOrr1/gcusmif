import db from "./db";

export type SitePageSlug = "about" | "investor-thesis";

type Row = {
  slug: string;
  content: string;
  updated_by: string | null;
  updated_at: string;
};

export function getPageContent(slug: SitePageSlug): string | null {
  const row = db.prepare("SELECT * FROM site_pages WHERE slug = ?").get(slug) as Row | undefined;
  return row?.content ?? null;
}

export function upsertPageContent(slug: SitePageSlug, content: string, updatedBy: string): void {
  db.prepare(
    `INSERT INTO site_pages (slug, content, updated_by, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(slug) DO UPDATE SET
       content = excluded.content,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).run(slug, content, updatedBy);
}
