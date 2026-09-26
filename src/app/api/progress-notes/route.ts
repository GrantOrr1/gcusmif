import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getCoverageForTicker } from "@/lib/coverageStore";
import { getWatchlistItemForTicker } from "@/lib/watchlistStore";
import { listProgressNotes, addProgressNote } from "@/lib/progressNotes";

const TICKER_RE = /^[A-Z0-9.-]{1,10}$/;
const MAX_WORDS = 100;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "").toUpperCase();
  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

  return NextResponse.json({ notes: listProgressNotes(ticker) });
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
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }
  if (!note) {
    return NextResponse.json({ error: "Note is required" }, { status: 400 });
  }
  if (wordCount(note) > MAX_WORDS) {
    return NextResponse.json({ error: `Notes are limited to ${MAX_WORDS} words` }, { status: 400 });
  }

  const coverage = getCoverageForTicker(ticker);
  const watchlistItem = getWatchlistItemForTicker(ticker);
  const assignedTo = [...(coverage?.assignedTo ?? []), ...(watchlistItem?.assignedTo ?? [])];
  const sector = coverage?.sector ?? watchlistItem?.sector;

  const isAssigned = assignedTo.includes(me.name);
  const isSectorHeadOfSector = me.role.includes("Sector Head") && !!sector && me.sector === sector;
  const isPortfolioManager = hasPortfolioManagerAccess(me);

  if (!(isAssigned || isSectorHeadOfSector || isPortfolioManager)) {
    return NextResponse.json(
      { error: "Only analysts assigned to this equity, its Sector Head, or the Portfolio Manager can add a step." },
      { status: 403 }
    );
  }

  const created = addProgressNote(ticker, note, me.name);
  return NextResponse.json({ note: created }, { status: 201 });
}
