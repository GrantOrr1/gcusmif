import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getSocialLinks, setSocialLink, type SocialPlatform } from "@/lib/socialLinks";

const PLATFORMS: SocialPlatform[] = ["instagram", "linkedin"];

export async function GET() {
  return NextResponse.json(getSocialLinks());
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!hasPortfolioManagerAccess(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  for (const platform of PLATFORMS) {
    if (body && platform in body) {
      const raw = body[platform];
      const url = typeof raw === "string" ? raw.trim().slice(0, 300) : "";
      setSocialLink(platform, url === "" ? null : url, me!.name);
    }
  }

  return NextResponse.json(getSocialLinks());
}
