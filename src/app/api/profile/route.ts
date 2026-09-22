import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { teamBySlug, isSamePerson } from "@/lib/team";
import { upsertProfileOverride } from "@/lib/profileOverrides";
import { normalizeExternalUrl } from "@/lib/url";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const slug = body?.slug;
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

  const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 2000) : undefined;
  const linkedinUrl =
    typeof body.linkedinUrl === "string"
      ? normalizeExternalUrl(body.linkedinUrl.trim().slice(0, 300))
      : undefined;
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : undefined;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  upsertProfileOverride(slug, {
    bio: bio === "" ? null : bio,
    linkedinUrl: linkedinUrl === "" ? null : linkedinUrl,
    email: email === "" ? null : email,
  });

  return NextResponse.json({ ok: true });
}
