import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { SECTOR_INFO } from "@/lib/sectors";
import { getQuote } from "@/lib/yahoo";
import { listWatchlist } from "@/lib/watchlistStore";
import { listPendingForReviewer, listMyPendingSubmissions } from "@/lib/ratingSubmissions";
import AddWatchlistForm from "@/components/watchlist/AddWatchlistForm";
import WatchlistItems from "@/components/watchlist/WatchlistItems";
import PendingRatingApprovals from "@/components/ratings/PendingRatingApprovals";
import MyPendingRatings from "@/components/ratings/MyPendingRatings";

export const metadata = {
  title: "Watchlist | Student Managed Investment Fund",
};

export default async function WatchlistPage() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));

  const canAdd = !!me;
  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = !!me?.role.includes("Sector Head");
  const canAssign = !!me && (isPortfolioManager || isSectorHead);
  const assignableTeam = !me
    ? []
    : isPortfolioManager
      ? TEAM
      : isSectorHead
        ? TEAM.filter((m) => m.sector === me.sector)
        : [me];
  const restrictedSector = isSectorHead ? (me?.sector ?? undefined) : undefined;

  const items = listWatchlist();
  const itemsWithQuotes = await Promise.all(
    items.map(async (w) => ({
      ...w,
      quote: await getQuote(w.ticker).catch(() => null),
    }))
  );

  const pendingForReview = canAssign
    ? listPendingForReviewer({
        targetType: "watchlist",
        isPortfolioManager,
        sector: me?.sector ?? null,
      })
    : [];
  const myPending = me ? listMyPendingSubmissions("watchlist", me.name) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Watchlist</h1>
          <p className="mt-1 text-sm text-muted">
            Equities our analysts are tracking.
          </p>
        </div>
        {canAdd && (
          <AddWatchlistForm
            canAssign={canAssign}
            isPortfolioManager={isPortfolioManager}
            restrictedSector={restrictedSector}
            assignableTeam={assignableTeam.map((m) => ({ name: m.name, role: m.role }))}
            defaultAssignee={me!.name}
          />
        )}
      </div>

      {pendingForReview.length > 0 && (
        <div className="mt-6">
          <PendingRatingApprovals
            initialItems={pendingForReview}
            heading="Watchlist Ratings Awaiting Approval"
          />
        </div>
      )}

      {myPending.length > 0 && (
        <div className="mt-6">
          <MyPendingRatings items={myPending} heading="Your Watchlist Ratings Awaiting Approval" />
        </div>
      )}

      {itemsWithQuotes.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          No equities on the watchlist yet. {canAdd ? "Add the first one above." : "Check back soon."}
        </p>
      ) : (
        <WatchlistItems
          items={itemsWithQuotes}
          sectors={SECTOR_INFO}
          isPortfolioManager={isPortfolioManager}
          isSectorHead={isSectorHead}
          mySector={me?.sector}
          myName={me?.name}
        />
      )}
    </div>
  );
}
