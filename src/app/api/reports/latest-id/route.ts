import { NextResponse } from "next/server";
import { listReportUploads } from "@/lib/reportUploads";

export async function GET() {
  const approvedIds = listReportUploads()
    .filter((r) => r.status === "approved")
    .map((r) => r.id);
  const latestId = approvedIds.length > 0 ? Math.max(...approvedIds) : null;
  return NextResponse.json({ latestId });
}
