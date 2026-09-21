import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { addWatchlistItem } from "@/lib/watchlistStore";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!me) {
    return NextResponse.json({ error: "No matching team profile" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : null;
  const sector = typeof body?.sector === "string" ? body.sector.trim() : "";
  const requestedAssignees: string[] = Array.isArray(body?.assignedTo)
    ? body.assignedTo.filter((v: unknown): v is string => typeof v === "string" && v.trim() !== "")
    : [];

  if (!ticker || !sector) {
    return NextResponse.json({ error: "Ticker and sector are required" }, { status: 400 });
  }

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = me.role.includes("Sector Head");

  let assignedTo: string[] = [me.name];
  const others = requestedAssignees.filter((n) => n !== me.name);

  if (others.length > 0 || (requestedAssignees.length > 0 && !requestedAssignees.includes(me.name))) {
    if (isPortfolioManager) {
      const names: string[] = [];
      for (const n of requestedAssignees) {
        const target = TEAM.find((m) => m.name === n);
        if (!target) {
          return NextResponse.json({ error: `Unknown team member: ${n}` }, { status: 400 });
        }
        names.push(target.name);
      }
      assignedTo = names;
    } else if (isSectorHead) {
      const names: string[] = [];
      for (const n of requestedAssignees) {
        const target = TEAM.find((m) => m.name === n && m.sector === me.sector);
        if (!target) {
          return NextResponse.json(
            { error: "You can only assign teammates in your own sector" },
            { status: 403 }
          );
        }
        names.push(target.name);
      }
      assignedTo = names;
    } else {
      return NextResponse.json(
        { error: "Only Sector Heads and the Portfolio Manager can assign to others" },
        { status: 403 }
      );
    }
  } else if (requestedAssignees.length > 0) {
    assignedTo = [me.name];
  }

  // Sector Heads may only tag the equity under their own sector, unless the
  // entry is for themselves only (in which case they can track anything).
  const isSelfOnly = assignedTo.length === 1 && assignedTo[0] === me.name;
  if (isSectorHead && !isPortfolioManager && !isSelfOnly && sector !== me.sector) {
    return NextResponse.json(
      { error: "You can only tag equities assigned to your team under your own sector" },
      { status: 403 }
    );
  }

  const item = addWatchlistItem({
    ticker,
    companyName,
    sector,
    assignedTo,
    targetPrice: null,
    triggerPrice: null,
    addedBy: me.name,
  });

  return NextResponse.json(item);
}
