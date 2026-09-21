import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getReportUpload, deleteReportUpload, updateReportTitle } from "@/lib/reportUploads";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!me) {
    return NextResponse.json({ error: "No matching team profile" }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  const report = Number.isFinite(id) ? getReportUpload(id) : undefined;
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHeadOfSector = me.role.includes("Sector Head") && me.sector === report.sector;

  if (report.status === "pending") {
    if (report.uploadedBy !== me.name) {
      return NextResponse.json({ error: "You can only cancel your own uploads" }, { status: 403 });
    }
  } else if (report.status === "approved") {
    if (!isPortfolioManager && !isSectorHeadOfSector) {
      return NextResponse.json(
        { error: "Only the Sector Head of this sector or the Portfolio Manager can delete this report" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json({ error: "This report has already been declined" }, { status: 400 });
  }

  deleteReportUpload(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!me) {
    return NextResponse.json({ error: "No matching team profile" }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  const report = Number.isFinite(id) ? getReportUpload(id) : undefined;
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHeadOfSector = me.role.includes("Sector Head") && me.sector === report.sector;
  if (!isPortfolioManager && !isSectorHeadOfSector) {
    return NextResponse.json(
      { error: "Only the Sector Head of this sector or the Portfolio Manager can rename this upload" },
      { status: 403 }
    );
  }

  if (report.status !== "pending") {
    return NextResponse.json({ error: "Only pending uploads can be renamed" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
  }

  const updated = updateReportTitle(id, title);
  return NextResponse.json(updated);
}
