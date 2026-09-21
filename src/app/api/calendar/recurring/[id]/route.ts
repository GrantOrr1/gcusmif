import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getRecurringEvent, updateRecurringEventTime, deleteRecurringEvent } from "@/lib/recurringEvents";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function requirePortfolioManager() {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!hasPortfolioManagerAccess(me)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { me };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  const existing = Number.isFinite(id) ? getRecurringEvent(id) : undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { me, error } = await requirePortfolioManager();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const startTime = typeof body?.startTime === "string" ? body.startTime : "";
  const endTime = typeof body?.endTime === "string" ? body.endTime : "";

  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return NextResponse.json({ error: "Invalid time" }, { status: 400 });
  }

  const updated = updateRecurringEventTime(id, startTime, endTime, me!.name);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  const existing = Number.isFinite(id) ? getRecurringEvent(id) : undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await requirePortfolioManager();
  if (error) return error;

  deleteRecurringEvent(id);
  return NextResponse.json({ ok: true });
}
