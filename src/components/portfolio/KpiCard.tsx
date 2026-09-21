export default function KpiCard({
  label,
  value,
  tone = "neutral",
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  compact?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : "text-foreground";

  return (
    <div
      className={`rounded-lg border border-border bg-surface ${
        compact ? "px-3 py-1.5" : "px-4 py-3"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`${compact ? "" : "mt-0.5"} text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
