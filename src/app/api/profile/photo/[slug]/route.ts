import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getProfileOverride } from "@/lib/profileOverrides";
import { AVATARS_DIR } from "@/lib/avatarUploads";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const override = getProfileOverride(slug);
  if (!override?.photoFile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fullPath = path.join(AVATARS_DIR, override.photoFile);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File missing on server" }, { status: 404 });
  }

  const ext = override.photoFile.split(".").pop() ?? "";
  const buffer = fs.readFileSync(fullPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
