import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { SECTOR_INFO } from "@/lib/sectors";
import { REPORTS } from "@/data/reports";
import { listPendingForReviewer, listReportUploads } from "@/lib/reportUploads";
import UploadReportForm from "@/components/reports/UploadReportForm";
import PendingApprovals from "@/components/reports/PendingApprovals";
import MyPendingUploads from "@/components/reports/MyPendingUploads";
import ReportsList from "@/components/reports/ReportsList";

export const metadata = {
  title: "Reports | Student Managed Investment Fund",
};

const TYPE_LABELS: Record<string, string> = {
  equity_report: "Equity Report",
  coverage_watchlist_report: "Coverage Watchlist Report",
  financial_model: "Financial Model",
};

export default async function ReportsPage() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));

  const canUpload = !!me;
  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = !!me?.role.includes("Sector Head");
  const canReview = isPortfolioManager || isSectorHead;

  const pendingItems = canReview
    ? listPendingForReviewer({ isPortfolioManager, sector: me?.sector ?? null })
    : [];

  const myPendingUploads = me
    ? listReportUploads().filter((u) => u.uploadedBy === me.name && u.status === "pending")
    : [];

  const approvedUploads = listReportUploads()
    .filter((u) => u.status === "approved")
    .map((u) => ({
      id: u.id,
      sector: u.sector,
      title: u.title,
      date: u.reviewedAt ?? u.createdAt,
      description: TYPE_LABELS[u.reportType] ?? u.reportType,
      ticker: u.ticker ?? undefined,
      uploadedBy: u.uploadedBy,
      url: `/api/reports/file/${u.id}`,
    }));

  const allReports = [...approvedUploads, ...REPORTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const canDelete = isPortfolioManager || isSectorHead;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="mt-2 text-sm text-muted">
            Equity Reports, Coverage Watchlist Reports, and Financial Models from our analysts.
          </p>
        </div>
        {canUpload && <UploadReportForm />}
      </div>

      {myPendingUploads.length > 0 && (
        <div className="mt-8"><MyPendingUploads initialItems={myPendingUploads} /></div>
      )}

      {canReview && <div className="mt-8"><PendingApprovals initialItems={pendingItems} /></div>}

      <ReportsList
        reports={allReports}
        canDelete={canDelete}
        isPortfolioManager={isPortfolioManager}
        mySector={me?.sector}
        sectors={SECTOR_INFO}
      />
    </div>
  );
}
