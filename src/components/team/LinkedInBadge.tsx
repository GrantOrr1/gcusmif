export default function LinkedInBadge({ url }: { url?: string }) {
  const icon = (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label="LinkedIn profile"
        className="text-muted transition-colors hover:text-brand"
      >
        {icon}
      </a>
    );
  }

  return (
    <span aria-hidden="true" className="text-muted/40 transition-colors hover:text-brand">
      {icon}
    </span>
  );
}
