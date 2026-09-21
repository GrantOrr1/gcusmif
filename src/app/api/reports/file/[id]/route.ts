import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getReportUpload, UPLOADS_DIR } from "@/lib/reportUploads";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  const report = Number.isFinite(id) ? getReportUpload(id) : undefined;
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (report.status !== "approved") {
    const session = await auth();
    const me = session ? TEAM.find((m) => isSamePerson(session.user?.name, m)) : undefined;
    const isPortfolioManager = hasPortfolioManagerAccess(me);
    const isSectorHeadOfSector = !!me?.role.includes("Sector Head") && me?.sector === report.sector;
    const isUploader = me?.name === report.uploadedBy;
    if (!me || !(isPortfolioManager || isSectorHeadOfSector || isUploader)) {
      return NextResponse.json({ error: "Not authorized to view this file" }, { status: 403 });
    }
  }

  const fullPath = path.join(UPLOADS_DIR, report.filePath);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File missing on server" }, { status: 404 });
  }

  const buffer = fs.readFileSync(fullPath);
  const disposition = report.reportType === "financial_model" ? "attachment" : "inline";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": report.mimeType,
      "Content-Disposition": `${disposition}; filename="${report.fileName.replace(/"/g, "")}"`,
    },
  });
}
