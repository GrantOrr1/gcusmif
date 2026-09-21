import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { insertReportUpload, saveUploadedFile, type ReportType } from "@/lib/reportUploads";

const REPORT_TYPES: ReportType[] = ["equity_report", "coverage_watchlist_report", "financial_model"];

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isExcel(file: File) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!me) {
    return NextResponse.json({ error: "No matching team profile" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form submission" }, { status: 400 });
  }

  const reportType = formData.get("reportType");
  if (typeof reportType !== "string" || !REPORT_TYPES.includes(reportType as ReportType)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (25MB max)" }, { status: 400 });
  }

  if (reportType === "financial_model") {
    if (!isExcel(file)) {
      return NextResponse.json(
        { error: "Financial Models must be an Excel file (.xlsx or .xls)" },
        { status: 400 }
      );
    }
  } else if (!isPdf(file)) {
    return NextResponse.json(
      { error: "Equity Reports and Coverage Watchlist Reports must be a PDF" },
      { status: 400 }
    );
  }

  const rawTicker = formData.get("ticker");
  const ticker = typeof rawTicker === "string" ? rawTicker.trim().toUpperCase() : "";
  if (!ticker) {
    return NextResponse.json({ error: "A ticker/company is required" }, { status: 400 });
  }
  const rawCompanyName = formData.get("companyName");
  const companyName = typeof rawCompanyName === "string" && rawCompanyName.trim() ? rawCompanyName.trim() : null;

  const rawTitle = formData.get("title");
  const title = typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : file.name;

  const rawCoAuthors = formData.get("coAuthors");
  let coAuthors: string[] = [];
  if (typeof rawCoAuthors === "string" && rawCoAuthors.trim()) {
    try {
      const parsed = JSON.parse(rawCoAuthors);
      if (Array.isArray(parsed)) {
        const validNames = new Set(TEAM.map((m) => m.name));
        coAuthors = [...new Set(parsed.filter((n): n is string => typeof n === "string" && validNames.has(n)))].filter(
          (n) => n !== me.name
        );
      }
    } catch {
      coAuthors = [];
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storedFileName = saveUploadedFile(file.name, buffer);

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = me.role.includes("Sector Head");
  const autoApproved = isPortfolioManager || isSectorHead;

  const upload = insertReportUpload({
    title,
    reportType: reportType as ReportType,
    ticker,
    companyName,
    fileName: file.name,
    filePath: storedFileName,
    mimeType: file.type || (reportType === "financial_model"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/pdf"),
    sector: me.sector ?? "Unassigned",
    uploadedBy: me.name,
    coAuthors,
    status: autoApproved ? "approved" : "pending",
    reviewedBy: autoApproved ? me.name : null,
  });

  return NextResponse.json(upload, { status: 201 });
}
