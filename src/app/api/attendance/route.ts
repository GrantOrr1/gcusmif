import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import {
  isValidAttendanceDate,
  listAttendanceForDate,
  upsertAttendance,
  type AttendanceStatus,
} from "@/lib/attendance";

function getRole(name: string | null | undefined) {
  const me = TEAM.find((m) => isSamePerson(name, m));
  if (!me) return null;
  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = me.role.includes("Sector Head");
  return { me, isPortfolioManager, isSectorHead };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const roleInfo = getRole(session?.user?.name);
  if (!roleInfo || !(roleInfo.isPortfolioManager || roleInfo.isSectorHead)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const date = req.nextUrl.searchParams.get("date") ?? "";
  const sectorParam = req.nextUrl.searchParams.get("sector") ?? "";
  const sector = roleInfo.isSectorHead ? (roleInfo.me.sector ?? "") : sectorParam;

  if (!isValidAttendanceDate(date)) {
    return NextResponse.json({ error: "Attendance is only tracked for Mondays and Saturdays" }, { status: 400 });
  }
  if (!sector) {
    return NextResponse.json({ error: "sector is required" }, { status: 400 });
  }

  const records = listAttendanceForDate(date, sector);
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const roleInfo = getRole(session?.user?.name);
  if (!roleInfo || !roleInfo.isSectorHead) {
    return NextResponse.json({ error: "Only Sector Heads can mark attendance" }, { status: 403 });
  }

  const sector = roleInfo.me.sector;
  if (!sector) {
    return NextResponse.json({ error: "Your account has no sector assigned" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const records = Array.isArray(body?.records) ? body.records : null;

  if (!isValidAttendanceDate(date)) {
    return NextResponse.json({ error: "Attendance is only tracked for Mondays and Saturdays" }, { status: 400 });
  }
  if (!records) {
    return NextResponse.json({ error: "records array is required" }, { status: 400 });
  }

  const sectorRoster = new Set(TEAM.filter((m) => m.sector === sector).map((m) => m.name));
  const clean: { name: string; status: AttendanceStatus }[] = [];
  for (const r of records) {
    if (
      r &&
      typeof r.name === "string" &&
      sectorRoster.has(r.name) &&
      (r.status === "present" || r.status === "excused" || r.status === "absent")
    ) {
      clean.push({ name: r.name, status: r.status });
    }
  }

  if (clean.length === 0) {
    return NextResponse.json({ error: "No valid records to save" }, { status: 400 });
  }

  upsertAttendance(date, sector, roleInfo.me.name, clean);
  return NextResponse.json({ ok: true });
}
