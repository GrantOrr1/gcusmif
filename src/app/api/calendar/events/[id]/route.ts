import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getCalendarEvent, deleteCalendarEvent } from "@/lib/calendarStore";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  const event = Number.isFinite(id) ? getCalendarEvent(id) : undefined;
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isCreator = me?.name === event.createdBy;
  if (!me || !(isPortfolioManager || isCreator)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  deleteCalendarEvent(id);
  return NextResponse.json({ ok: true });
}
