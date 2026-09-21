export default function EmailBadge({ email }: { email?: string }) {
  const icon = (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
      <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5v-13Zm2.2.5 7.3 5.47a.8.8 0 0 0 .96 0L19.8 6H4.2ZM20 7.7l-6.87 5.15a2.8 2.8 0 0 1-3.36 0L4 7.7V18h16V7.7Z" />
    </svg>
  );

  if (email) {
    return (
      <a
        href={`mailto:${email}`}
        aria-label="Email"
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
