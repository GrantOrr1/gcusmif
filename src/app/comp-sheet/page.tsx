import { auth } from "@/auth";
import CompSheet from "@/components/comp-sheet/CompSheet";

export const metadata = {
  title: "Comp Sheet | Student Managed Investment Fund",
};

export default async function CompSheetPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Comp Sheet</h1>
        <p className="mt-4 text-sm text-muted">
          This page is only available to logged-in analysts.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Comp Sheet</h1>
      <p className="mt-1 text-sm text-muted">
        Build a comparable companies table — search tickers for the rows, and valuation,
        profitability, or liquidity metrics for the columns.
      </p>
      <div className="mt-6">
        <CompSheet />
      </div>
    </div>
  );
}
