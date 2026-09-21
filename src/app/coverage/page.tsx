import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { SECTOR_INFO, sectorByCode } from "@/lib/sectors";
import { getPortfolioData } from "@/lib/portfolio";
import { listCoverage } from "@/lib/coverageStore";
import { listPendingForReviewer, listMyPendingSubmissions } from "@/lib/ratingSubmissions";
import CoverageItems from "@/components/coverage/CoverageItems";
import PendingRatingApprovals from "@/components/ratings/PendingRatingApprovals";
import MyPendingRatings from "@/components/ratings/MyPendingRatings";

export const metadata = {
  title: "Coverage | Student Managed Investment Fund",
};

export default async function CoveragePage() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));
  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = !!me?.role.includes("Sector Head");
  const canAssign = isPortfolioManager || isSectorHead;

  const data = await getPortfolioData();
  const holdings = data.holdings.filter((h) => h.ticker && h.quantity !== null && h.quantity > 0);
  const coverageByTicker = new Map(listCoverage().map((c) => [c.ticker, c]));

  const items = holdings.map((h) => ({
    ticker: h.ticker,
    companyName: h.companyName,
    sector: h.sector ? (sectorByCode(h.sector)?.label ?? h.sector) : "Unassigned",
    currentPrice: h.currentPrice,
    percentChange: h.percentChange,
    assignedTo: coverageByTicker.get(h.ticker)?.assignedTo ?? [],
    rating: coverageByTicker.get(h.ticker)?.rating ?? null,
    targetPrice: coverageByTicker.get(h.ticker)?.targetPrice ?? null,
    triggerPrice: coverageByTicker.get(h.ticker)?.triggerPrice ?? null,
  }));

  const assignableTeam = isPortfolioManager
    ? TEAM.map((m) => ({ name: m.name, role: m.role }))
    : TEAM.filter((m) => m.sector === me?.sector).map((m) => ({ name: m.name, role: m.role }));

  const pendingForReview = canAssign
    ? listPendingForReviewer({
        targetType: "coverage",
        isPortfolioManager,
        sector: me?.sector ?? null,
      })
    : [];
  const myPending = me ? listMyPendingSubmissions("coverage", me.name) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Coverage</h1>
        <p className="mt-1 text-sm text-muted">
          Assign the analysts responsible for covering each fund holding, and rate holdings you cover.
        </p>
      </div>

      {pendingForReview.length > 0 && (
        <div className="mt-6">
          <PendingRatingApprovals
            initialItems={pendingForReview}
            heading="Holdings Ratings Awaiting Approval"
          />
        </div>
      )}

      {myPending.length > 0 && (
        <div className="mt-6">
          <MyPendingRatings items={myPending} heading="Your Holdings Ratings Awaiting Approval" />
        </div>
      )}

      <CoverageItems
        items={items}
        sectors={SECTOR_INFO}
        isPortfolioManager={isPortfolioManager}
        canRate={!!me}
        mySector={me?.sector}
        assignableTeam={assignableTeam}
      />
    </div>
  );
}
