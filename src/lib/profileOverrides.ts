import db from "./db";

export type ProfileOverride = {
  slug: string;
  bio: string | null;
  linkedinUrl: string | null;
  photoFile: string | null;
  updatedAt: string;
};

type Row = {
  slug: string;
  bio: string | null;
  linkedin_url: string | null;
  photo_file: string | null;
  updated_at: string;
};

export function getProfileOverride(slug: string): ProfileOverride | null {
  const row = db
    .prepare("SELECT * FROM profile_overrides WHERE slug = ?")
    .get(slug) as Row | undefined;
  if (!row) return null;
  return {
    slug: row.slug,
    bio: row.bio,
    linkedinUrl: row.linkedin_url,
    photoFile: row.photo_file,
    updatedAt: row.updated_at,
  };
}

export function upsertProfileOverride(
  slug: string,
  data: { bio?: string | null; linkedinUrl?: string | null; photoFile?: string | null }
): void {
  const existing = getProfileOverride(slug);
  const bio = data.bio !== undefined ? data.bio : (existing?.bio ?? null);
  const linkedinUrl =
    data.linkedinUrl !== undefined ? data.linkedinUrl : (existing?.linkedinUrl ?? null);
  const photoFile = data.photoFile !== undefined ? data.photoFile : (existing?.photoFile ?? null);

  db.prepare(
    `INSERT INTO profile_overrides (slug, bio, linkedin_url, photo_file, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(slug) DO UPDATE SET
       bio = excluded.bio,
       linkedin_url = excluded.linkedin_url,
       photo_file = excluded.photo_file,
       updated_at = excluded.updated_at`
  ).run(slug, bio, linkedinUrl, photoFile);
}
