import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { countAttendanceBySector } from "@/lib/attendance";

export async function GET(req: NextRequest) {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));
  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = !!me?.role.includes("Sector Head");
  if (!me || !(isPortfolioManager || isSectorHead)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const sectorParam = req.nextUrl.searchParams.get("sector") ?? "";
  const sector = isSectorHead ? (me.sector ?? "") : sectorParam;
  if (!sector) {
    return NextResponse.json({ error: "sector is required" }, { status: 400 });
  }

  const counts = countAttendanceBySector(sector);
  return NextResponse.json({ counts });
}
