import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getPortfolioData } from "@/lib/portfolio";
import { sectorByCode } from "@/lib/sectors";
import { setCoverageAssignment } from "@/lib/coverageStore";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!me) {
    return NextResponse.json({ error: "No matching team profile" }, { status: 403 });
  }

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = me.role.includes("Sector Head");
  if (!isPortfolioManager && !isSectorHead) {
    return NextResponse.json(
      { error: "Only Sector Heads and the Portfolio Manager can assign coverage" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const requestedAssignees: string[] = Array.isArray(body?.assignedTo)
    ? body.assignedTo.filter((v: unknown): v is string => typeof v === "string" && v.trim() !== "")
    : [];

  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
  }

  const portfolio = await getPortfolioData();
  const holding = portfolio.holdings.find((h) => h.ticker === ticker);
  if (!holding) {
    return NextResponse.json({ error: "Not a current fund holding" }, { status: 400 });
  }
  const sectorLabel = holding.sector ? (sectorByCode(holding.sector)?.label ?? holding.sector) : "Unassigned";

  if (!isPortfolioManager && sectorLabel !== me.sector) {
    return NextResponse.json(
      { error: "You can only assign coverage for holdings in your own sector" },
      { status: 403 }
    );
  }

  const assignedTo: string[] = [];
  for (const n of requestedAssignees) {
    const target = isPortfolioManager
      ? TEAM.find((m) => m.name === n)
      : TEAM.find((m) => m.name === n && m.sector === me.sector);
    if (!target) {
      return NextResponse.json(
        {
          error: isPortfolioManager
            ? `Unknown team member: ${n}`
            : "You can only assign teammates in your own sector",
        },
        { status: 400 }
      );
    }
    assignedTo.push(target.name);
  }

  const item = setCoverageAssignment({
    ticker,
    sector: sectorLabel,
    assignedTo,
    updatedBy: me.name,
  });

  return NextResponse.json(item);
}
