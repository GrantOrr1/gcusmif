export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted sm:px-6">
        <p>
          The information on this site is provided for educational purposes
          only and does not constitute investment advice or an offer to buy
          or sell any security. Holdings and performance data reflect a
          student-managed investment fund and may be delayed.
        </p>
        <p className="mt-2">
          &copy; {new Date().getFullYear()} Student Managed Investment Fund.
        </p>
      </div>
    </footer>
  );
}
