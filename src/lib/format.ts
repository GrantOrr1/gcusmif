export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: "exceptZero",
  }).format(value);
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

/** Accepts either a "YYYY-MM-DD" date or a full ISO timestamp (intraday points). */
export function formatShortDate(dateStr: string): string {
  if (dateStr.includes("T")) {
    const d = new Date(dateStr);
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const date = d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
    return `${date} ${time}`;
  }
  const [, month, day] = dateStr.split("-");
  if (!month || !day) return dateStr;
  return `${month}/${day}`;
}

/** Full point label for hover tooltips — date + time for intraday points, plain date otherwise. */
export function formatPointDateTime(dateStr: string): string {
  if (dateStr.includes("T")) {
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  return dateStr;
}
