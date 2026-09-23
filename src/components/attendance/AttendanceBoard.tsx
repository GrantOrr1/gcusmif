"use client";

import { useMemo, useState, useEffect } from "react";
import Avatar from "@/components/team/Avatar";
import AttendanceBarChart from "@/components/attendance/AttendanceBarChart";
import MeetingDatePicker from "@/components/attendance/MeetingDatePicker";

type RosterMember = { name: string; role: string };
type SectorRoster = { sector: string; roster: RosterMember[] };
type AttendanceStatus = "present" | "excused" | "absent";
type AttendanceRecord = { personName: string; status: AttendanceStatus };
type Loaded = { key: string; statuses: Record<string, AttendanceStatus> };

const SEASON_START = "2026-08-01";
const SEASON_END = "2027-04-30";

/** Every Monday/Saturday of the season, most recent first. */
function seasonMeetingDates(): { value: string; label: string }[] {
  const dates: { value: string; label: string }[] = [];
  const d = new Date(`${SEASON_START}T00:00:00`);
  const end = new Date(`${SEASON_END}T00:00:00`);
  while (d <= end) {
    const day = d.getDay();
    if (day === 1 || day === 6) {
      const value = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      dates.push({ value, label });
    }
    d.setDate(d.getDate() + 1);
  }
  return dates.reverse();
}

function defaultMeetingDate(dates: { value: string; label: string }[]): string {
  const todayValue = new Date().toISOString().slice(0, 10);
  const pastOrToday = dates.find((d) => d.value <= todayValue);
  return pastOrToday?.value ?? dates[dates.length - 1]?.value ?? "";
}

export default function AttendanceBoard({
  canEdit,
  sectorRosters,
  defaultSector,
}: {
  canEdit: boolean;
  sectorRosters: SectorRoster[];
  defaultSector: string;
}) {
  const dates = useMemo(() => seasonMeetingDates(), []);
  const validDates = useMemo(() => new Set(dates.map((d) => d.value)), [dates]);
  const [sector, setSector] = useState(defaultSector);
  const [date, setDate] = useState(() => defaultMeetingDate(dates));
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [edits, setEdits] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [counts, setCounts] = useState<{ key: string; data: Record<string, number> } | null>(null);

  const roster = sectorRosters.find((s) => s.sector === sector)?.roster ?? [];
  const key = `${sector}|${date}`;
  const loading = loaded?.key !== key;
  const baseStatuses = loaded?.key === key ? loaded.statuses : {};
  const statuses = { ...baseStatuses, ...edits };

  useEffect(() => {
    if (!sector || !date) return;
    let cancelled = false;
    fetch(`/api/attendance?date=${date}&sector=${encodeURIComponent(sector)}`)
      .then((res) => res.json())
      .then((json: { records?: AttendanceRecord[] }) => {
        if (cancelled) return;
        const map: Record<string, AttendanceStatus> = {};
        for (const r of json.records ?? []) map[r.personName] = r.status;
        setLoaded({ key, statuses: map });
        setEdits({});
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ key, statuses: {} });
          setEdits({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sector, date, key]);

  useEffect(() => {
    if (!sector) return;
    let cancelled = false;
    fetch(`/api/attendance/summary?sector=${encodeURIComponent(sector)}`)
      .then((res) => res.json())
      .then((json: { counts?: Record<string, number> }) => {
        if (!cancelled) setCounts({ key: sector, data: json.counts ?? {} });
      })
      .catch(() => {
        if (!cancelled) setCounts({ key: sector, data: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [sector, loaded]);

  function setStatus(name: string, status: AttendanceStatus) {
    setEdits((prev) => ({ ...prev, [name]: status }));
    setSavedNotice(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const records = roster.map((m) => ({ name: m.name, status: statuses[m.name] ?? "absent" }));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Could not save attendance.");
        return;
      }
      setLoaded({ key, statuses });
      setEdits({});
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  }

  const chartData = roster.map((m) => ({
    name: m.name,
    count: counts?.key === sector ? (counts.data[m.name] ?? 0) : 0,
  }));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        {sectorRosters.length > 1 && (
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          >
            {sectorRosters.map((s) => (
              <option key={s.sector} value={s.sector}>
                {s.sector}
              </option>
            ))}
          </select>
        )}
        <MeetingDatePicker value={date} onChange={setDate} validDates={validDates} />
      </div>

      {error && <p className="mt-3 text-sm text-negative">{error}</p>}

      <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
        {loading ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : roster.length === 0 ? (
          <p className="p-4 text-sm text-muted">No one is assigned to this sector.</p>
        ) : (
          roster.map((m) => {
            const status = statuses[m.name];
            return (
              <div key={m.name} className="flex items-center justify-between gap-4 p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} size={32} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted">{m.role}</p>
                  </div>
                </div>

                {canEdit ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatus(m.name, "present")}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                        status === "present"
                          ? "border-positive bg-positive text-white"
                          : "border-border text-muted hover:text-foreground"
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => setStatus(m.name, "excused")}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                        status === "excused"
                          ? "border-brand bg-brand text-white"
                          : "border-border text-muted hover:text-foreground"
                      }`}
                    >
                      Excused
                    </button>
                    <button
                      onClick={() => setStatus(m.name, "absent")}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                        status === "absent"
                          ? "border-negative bg-negative text-white"
                          : "border-border text-muted hover:text-foreground"
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                ) : (
                  <span
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      status === "present"
                        ? "text-positive"
                        : status === "excused"
                          ? "text-brand"
                          : status === "absent"
                            ? "text-negative"
                            : "text-muted"
                    }`}
                  >
                    {status === "present"
                      ? "Present"
                      : status === "excused"
                        ? "Excused"
                        : status === "absent"
                          ? "Absent"
                          : "Not marked"}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {canEdit && roster.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Attendance"}
          </button>
          {savedNotice && <p className="text-sm text-positive">Saved.</p>}
        </div>
      )}

      {roster.length > 0 && (
        <div className="mt-8">
          <AttendanceBarChart data={chartData} />
        </div>
      )}
    </div>
  );
}
