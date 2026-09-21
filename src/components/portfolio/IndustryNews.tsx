import type { NewsItem } from "@/lib/industryNews";

export default function IndustryNews({
  title,
  items,
  emptyMessage,
}: {
  title?: string;
  items: NewsItem[];
  emptyMessage?: string;
}) {
  if (items.length === 0 && !emptyMessage) return null;

  return (
    <div className="mt-10">
      {title && <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>}
      {items.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface">
          {items.map((n) => (
            <a
              key={n.link}
              href={n.link}
              target="_blank"
              rel="noreferrer"
              title={n.title}
              className="flex min-h-[3.375rem] items-center justify-between gap-4 p-3 hover:bg-background"
            >
              <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium text-foreground">{n.title}</p>
              <span className="shrink-0 whitespace-nowrap text-xs text-muted">
                {n.publisher} ·{" "}
                {new Date(n.publishedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
