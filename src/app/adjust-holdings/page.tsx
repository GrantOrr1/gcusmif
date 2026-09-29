import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import AdjustHoldingsForm from "@/components/holdings/AdjustHoldingsForm";

export const metadata = {
  title: "Adjust Holding Positions | Student Managed Investment Fund",
};

export default async function AdjustHoldingsPage() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));

  if (!me || !hasPortfolioManagerAccess(me)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Adjust Holding Positions</h1>
        <p className="mt-4 text-sm text-muted">
          This page is only available to the Portfolio Manager.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Adjust Holding Positions</h1>
      <p className="mt-1 text-sm text-muted">
        Log individual buy and sell orders — ticker, shares, price, and the exact date and time of
        the trade — so holdings and performance can be tracked lot by lot instead of from the
        spreadsheet.
      </p>
      <div className="mt-6">
        <AdjustHoldingsForm />
      </div>
    </div>
  );
}
