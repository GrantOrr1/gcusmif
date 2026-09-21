import Link from "next/link";
import type { RatingSubmission } from "@/lib/ratingSubmissions";
import { formatPrice } from "@/lib/format";

export default function MyPendingRatings({
  items,
  heading,
}: {
  items: RatingSubmission[];
  heading: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-8 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{heading}</h2>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
          >
            <div>
              <Link
                href={`/equity/${item.ticker}`}
                className="font-medium text-foreground hover:text-brand"
              >
                {item.ticker}
              </Link>
              <p className="mt-0.5 text-xs text-muted">
                {item.rating ?? "No rating"}
                {item.targetPrice !== null && <> · Target {formatPrice(item.targetPrice)}</>}
                {item.triggerPrice !== null && <> · Trigger Sell {formatPrice(item.triggerPrice)}</>}
                {" · "}Pending review
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
