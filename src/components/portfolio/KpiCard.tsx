export default function KpiCard({
  label,
  value,
  tone = "neutral",
  compact = false,
  evenHeight = compact,
  layout = "stacked",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  compact?: boolean;
  /** Forces a consistent min-height — needed in multi-column grids where labels
   * wrap to different numbers of lines across rows. Off by default in a single
   * column, where every box is its own row and natural sizing looks better. */
  evenHeight?: boolean;
  /** "row" puts the label and value side by side on one line, for a shorter box. */
  layout?: "stacked" | "row";
}) {
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : "text-foreground";

  if (layout === "row") {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border border-border bg-surface ${
          compact ? "px-3 py-2" : "px-4 py-3"
        } ${evenHeight ? "min-h-[4.5rem]" : ""}`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className={`shrink-0 text-lg font-semibold ${toneClass}`}>{value}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col justify-between gap-1 rounded-lg border border-border bg-surface ${
        compact ? "px-3 py-1.5" : "px-4 py-3"
      } ${evenHeight ? "min-h-[4.5rem]" : ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
