export default function AttendanceBarChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
        Meetings Attended
      </p>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-sm text-foreground">{d.name}</span>
            <div className="h-4 flex-1 rounded bg-background">
              <div
                className="h-4 rounded bg-brand transition-all"
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-sm font-medium text-muted">
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
