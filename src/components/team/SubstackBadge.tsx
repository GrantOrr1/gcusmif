import { normalizeExternalUrl } from "@/lib/url";

// Unlike LinkedIn/Email, this is a rare optional extra — no link means no
// icon at all, rather than a grayed-out placeholder.
export default function SubstackBadge({ url: rawUrl }: { url?: string }) {
  if (!rawUrl) return null;
  const url = normalizeExternalUrl(rawUrl);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Substack"
      className="text-muted transition-colors hover:text-brand"
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
        <path d="M0 0v3.4h24V0H0Zm0 5.1v3.4h24V5.1H0Zm0 5.2V24l12-6.9L24 24V10.3H0Z" />
      </svg>
    </a>
  );
}
