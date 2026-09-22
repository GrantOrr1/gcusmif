/**
 * People commonly paste profile links without a protocol (e.g.
 * "linkedin.com/in/name"). Used as an <a href>, that's a relative link that
 * resolves against the current page instead of opening the external site.
 * Prepend https:// so it always resolves externally.
 */
export function normalizeExternalUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
