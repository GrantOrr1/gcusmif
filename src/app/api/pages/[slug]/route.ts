import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { upsertPageContent, type SitePageSlug } from "@/lib/sitePages";

const EDITABLE_SLUGS: SitePageSlug[] = ["about", "investor-thesis"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!EDITABLE_SLUGS.includes(slug as SitePageSlug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!me || !hasPortfolioManagerAccess(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim().slice(0, 20000) : null;
  if (content === null) {
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }

  upsertPageContent(slug as SitePageSlug, content, me.name);
  return NextResponse.json({ ok: true });
}
