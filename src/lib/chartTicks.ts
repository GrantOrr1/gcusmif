export function evenIndices(length: number, count: number): number[] {
  if (length <= 0) return [];
  const n = Math.min(count, length);
  if (n <= 1) return [0];
  const indices = new Set<number>();
  for (let i = 0; i < n; i++) {
    indices.add(Math.round((i / (n - 1)) * (length - 1)));
  }
  return Array.from(indices).sort((a, b) => a - b);
}
