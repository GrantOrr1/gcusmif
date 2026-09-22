import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { listCalendarEvents, addCalendarEvent } from "@/lib/calendarStore";
import { RECURRING_COLOR, EARNINGS_COLOR } from "@/lib/calendarColors";
import { withCoverage } from "@/lib/tickerCoverage";
import type { TeamMember } from "@/data/team";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TICKER_RE = /^[A-Z0-9.-]{1,10}$/;

function canManageCalendar(person: TeamMember | undefined): boolean {
  return hasPortfolioManagerAccess(person) || !!person?.role.includes("Sector Head");
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(listCalendarEvents().map(withCoverage));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!me) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
  const description =
    typeof body?.description === "string" ? body.description.trim().slice(0, 2000) : "";
  let color = typeof body?.color === "string" ? body.color : "";
  const startTime = typeof body?.startTime === "string" && body.startTime ? body.startTime : null;
  const endTime = typeof body?.endTime === "string" && body.endTime ? body.endTime : null;
  const ticker =
    typeof body?.ticker === "string" && body.ticker.trim() ? body.ticker.trim().toUpperCase() : null;

  // Earnings-call events (ticker set) are open to every analyst; regular
  // events are still restricted to Sector Heads and the Portfolio Manager.
  if (!ticker && !canManageCalendar(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (startTime && !TIME_RE.test(startTime)) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }
  if (endTime && !TIME_RE.test(endTime)) {
    return NextResponse.json({ error: "Invalid end time" }, { status: 400 });
  }

  if (ticker) {
    if (!TICKER_RE.test(ticker)) {
      return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
    }
    color = EARNINGS_COLOR;
  } else {
    if (!COLOR_RE.test(color)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }
    if (color === RECURRING_COLOR) {
      return NextResponse.json(
        { error: "That color is reserved for the weekly recurring events" },
        { status: 400 }
      );
    }
    if (color === EARNINGS_COLOR) {
      return NextResponse.json(
        { error: "That color is reserved for earnings-call events" },
        { status: 400 }
      );
    }
  }

  const event = addCalendarEvent({
    date,
    title,
    description: description || null,
    color,
    startTime,
    endTime,
    ticker,
    createdBy: me.name,
  });

  return NextResponse.json(withCoverage(event), { status: 201 });
}
