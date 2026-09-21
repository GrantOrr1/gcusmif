import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { teamBySlug, isSamePerson } from "@/lib/team";
import { getProfileOverride, upsertProfileOverride } from "@/lib/profileOverrides";
import { saveAvatarFile, deleteAvatarFile } from "@/lib/avatarUploads";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form submission" }, { status: 400 });
  }

  const slug = formData.get("slug");
  if (typeof slug !== "string") {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const person = teamBySlug(slug);
  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isSamePerson(session.user?.name, person)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "An image is required" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Image is too large (5MB max)" }, { status: 400 });
  }
  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Image must be PNG, JPEG, or WebP" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storedName = saveAvatarFile(buffer, ext);

  const previous = getProfileOverride(slug);
  upsertProfileOverride(slug, { photoFile: storedName });
  if (previous?.photoFile) deleteAvatarFile(previous.photoFile);

  return NextResponse.json({ ok: true });
}
