import db from "./db";

export type SocialPlatform = "instagram" | "linkedin";

export type SocialLinks = {
  instagram: string | null;
  linkedin: string | null;
};

type Row = { platform: SocialPlatform; url: string | null };

export function getSocialLinks(): SocialLinks {
  const rows = db.prepare("SELECT platform, url FROM social_links").all() as Row[];
  const links: SocialLinks = { instagram: null, linkedin: null };
  for (const row of rows) {
    links[row.platform] = row.url;
  }
  return links;
}

export function setSocialLink(platform: SocialPlatform, url: string | null, updatedBy: string): void {
  db.prepare(
    `INSERT INTO social_links (platform, url, updated_by, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(platform) DO UPDATE SET
       url = excluded.url,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).run(platform, url, updatedBy);
}
