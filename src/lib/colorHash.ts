const PALETTE = [
  "#7c3aed",
  "#0ea5e9",
  "#16a34a",
  "#f59e0b",
  "#e11d48",
  "#0891b2",
  "#84cc16",
  "#a855f7",
  "#f97316",
  "#64748b",
];

const cache = new Map<string, string>();

export function hashColor(key: string): string {
  const normalized = key.toUpperCase();
  const existing = cache.get(normalized);
  if (existing) return existing;

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  const color = PALETTE[hash % PALETTE.length];
  cache.set(normalized, color);
  return color;
}
