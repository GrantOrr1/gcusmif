import fs from "node:fs";
import path from "node:path";

export const AVATARS_DIR =
  process.env.AVATARS_DIR ?? path.join(process.cwd(), "data", "uploads", "avatars");

export function saveAvatarFile(buffer: Buffer, ext: string): string {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
  const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(AVATARS_DIR, storedName), buffer);
  return storedName;
}

export function deleteAvatarFile(fileName: string): void {
  fs.rm(path.join(AVATARS_DIR, fileName), { force: true }, () => {});
}
