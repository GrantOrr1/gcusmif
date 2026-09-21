"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CalendarEvent } from "@/lib/calendarStore";
import type { RecurringEvent, RecurringException } from "@/lib/recurringEvents";
import { EVENT_COLOR_OPTIONS, EARNINGS_COLOR, formatTime12, weekdayName } from "@/lib/calendarColors";
import { slugifyName } from "@/lib/team";
import Avatar from "@/components/team/Avatar";

type EnrichedEvent = CalendarEvent & { coveringNames: string[] };

const MAX_YEAR = 2028;
const MAX_MONTH = 11; // December (0-indexed)

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isAtMax(year: number, month: number): boolean {
  return year === MAX_YEAR && month === MAX_MONTH;
}

function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) return `${formatTime12(start)} – ${formatTime12(end)}`;
  return formatTime12(start ?? end!);
}

type Selection =
  | { kind: "event"; id: number }
  | { kind: "recurring"; id: number; date: string };

export default function CalendarView({
  initialEvents,
  initialRecurring,
  initialExceptions,
  equityOptions,
  canAdd,
  myName,
  isPortfolioManager,
}: {
  initialEvents: EnrichedEvent[];
  initialRecurring: RecurringEvent[];
  initialExceptions: RecurringException[];
  equityOptions: { ticker: string; companyName: string | null }[];
  canAdd: boolean;
  myName: string | null;
  isPortfolioManager: boolean;
}) {
  const today = new Date();
  const [{ year, month }, setYearMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [events, setEvents] = useState(initialEvents);
  const [recurring, setRecurring] = useState(initialRecurring);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    title: string;
    description: string | null;
    timeRange: string | null;
    x: number;
    y: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingRecurring, setEditingRecurring] = useState(false);
  const [recurringStart, setRecurringStart] = useState("");
  const [recurringEnd, setRecurringEnd] = useState("");
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [confirmDeleteRecurring, setConfirmDeleteRecurring] = useState(false);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EnrichedEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const exceptionKeys = useMemo(
    () => new Set(exceptions.map((ex) => `${ex.recurringEventId}|${ex.date}`)),
    [exceptions]
  );

  const selectedEvent = selection?.kind === "event" ? (events.find((e) => e.id === selection.id) ?? null) : null;
  const selectedRecurring =
    selection?.kind === "recurring" ? (recurring.find((r) => r.id === selection.id) ?? null) : null;
  const selectedRecurringDate = selection?.kind === "recurring" ? selection.date : null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfirmDeleteRecurring(false);
  }, [selection]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const total = daysInMonth(year, month);
    const prevTotal = daysInMonth(year, month === 0 ? 11 : month - 1);
    const result: { day: number; inMonth: boolean; dateKey: string | null; weekday: number }[] = [];

    for (let i = 0; i < firstWeekday; i++) {
      result.push({
        day: prevTotal - firstWeekday + 1 + i,
        inMonth: false,
        dateKey: null,
        weekday: i,
      });
    }
    for (let d = 1; d <= total; d++) {
      result.push({
        day: d,
        inMonth: true,
        dateKey: toDateKey(year, month, d),
        weekday: (firstWeekday + d - 1) % 7,
      });
    }
    while (result.length % 7 !== 0) {
      const nextDay = result.length - (firstWeekday + total) + 1;
      result.push({ day: nextDay, inMonth: false, dateKey: null, weekday: result.length % 7 });
    }
    return result;
  }, [year, month]);

  function goPrev() {
    setYearMonth(({ year: y, month: m }) => (m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }));
  }

  function goNext() {
    setYearMonth(({ year: y, month: m }) => {
      if (isAtMax(y, m)) return { year: y, month: m };
      return m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 };
    });
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError("Could not delete. Try again.");
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSelection(null);
    } catch {
      setDeleteError("Could not delete. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  function openRecurringEdit() {
    if (!selectedRecurring) return;
    setRecurringStart(selectedRecurring.startTime);
    setRecurringEnd(selectedRecurring.endTime);
    setRecurringError(null);
    setEditingRecurring(true);
  }

  async function handleDeleteRecurring(id: number, date: string) {
    setSavingRecurring(true);
    setRecurringError(null);
    setConfirmDeleteRecurring(false);
    try {
      const res = await fetch(`/api/calendar/recurring/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        setRecurringError("Could not delete. Try again.");
        return;
      }
      setExceptions((prev) => [...prev, { recurringEventId: id, date }]);
      setSelection(null);
    } catch {
      setRecurringError("Could not delete. Try again.");
    } finally {
      setSavingRecurring(false);
    }
  }

  async function handleSaveRecurring() {
    if (!selectedRecurring) return;
    setSavingRecurring(true);
    setRecurringError(null);
    try {
      const res = await fetch(`/api/calendar/recurring/${selectedRecurring.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: recurringStart, endTime: recurringEnd }),
      });
      if (!res.ok) {
        setRecurringError("Could not save. Try again.");
        return;
      }
      const updated: RecurringEvent = await res.json();
      setRecurring((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditingRecurring(false);
    } catch {
      setRecurringError("Could not save. Try again.");
    } finally {
      setSavingRecurring(false);
    }
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">{monthLabel}</h2>
          <div className="flex gap-2">
            {canAdd && (
              <button
                onClick={() => setAddDate(toDateKey(today.getFullYear(), today.getMonth(), today.getDate()))}
                className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                + Create Event
              </button>
            )}
            <button
              onClick={goPrev}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted hover:border-brand hover:text-foreground"
            >
              ← Prev
            </button>
            <button
              onClick={goNext}
              disabled={isAtMax(year, month)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted hover:border-brand hover:text-foreground disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-surface px-2 py-1.5 text-center text-xs font-medium uppercase tracking-wide text-muted"
            >
              {label}
            </div>
          ))}

          {cells.map((cell, i) => {
            const dayEvents = cell.dateKey ? (eventsByDate.get(cell.dateKey) ?? []) : [];
            const dayRecurring = cell.inMonth
              ? recurring.filter(
                  (r) => r.weekday === cell.weekday && !exceptionKeys.has(`${r.id}|${cell.dateKey}`)
                )
              : [];
            const isToday =
              cell.inMonth &&
              cell.dateKey === toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
            return (
              <div
                key={i}
                className={`flex min-h-[100px] flex-col gap-1 bg-surface p-1.5 ${
                  cell.inMonth ? "" : "opacity-30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white"
                        : "text-muted"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.inMonth && canAdd && (
                    <button
                      onClick={() => setAddDate(cell.dateKey)}
                      aria-label="Add event"
                      className="text-muted hover:text-brand"
                    >
                      +
                    </button>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  {dayRecurring.map((r) => (
                    <button
                      key={`r-${r.id}`}
                      onClick={() => setSelection({ kind: "recurring", id: r.id, date: cell.dateKey! })}
                      onMouseEnter={(ev) => {
                        const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                        setHoverInfo({
                          title: r.title,
                          description: r.description,
                          timeRange: formatTimeRange(r.startTime, r.endTime),
                          x: rect.left,
                          y: rect.bottom,
                        });
                      }}
                      onMouseLeave={() => setHoverInfo(null)}
                      className="truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white"
                      style={{ backgroundColor: r.color }}
                    >
                      {r.title}
                    </button>
                  ))}
                  {dayEvents.map((e) => (
                    <button
                      key={`e-${e.id}`}
                      onClick={() => setSelection({ kind: "event", id: e.id })}
                      onMouseEnter={(ev) => {
                        const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                        setHoverInfo({
                          title: e.title,
                          description: e.description,
                          timeRange: formatTimeRange(e.startTime, e.endTime),
                          x: rect.left,
                          y: rect.bottom,
                        });
                      }}
                      onMouseLeave={() => setHoverInfo(null)}
                      className="truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white"
                      style={{ backgroundColor: e.color }}
                    >
                      {e.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        {selectedRecurring ? (
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: selectedRecurring.color }}
              />
              <h3 className="text-lg font-semibold text-foreground">{selectedRecurring.title}</h3>
            </div>
            <p className="mt-1 text-xs text-muted">
              Every {weekdayName(selectedRecurring.weekday)},{" "}
              {formatTimeRange(selectedRecurring.startTime, selectedRecurring.endTime)}
            </p>
            {selectedRecurringDate && (
              <p className="mt-0.5 text-xs text-muted">
                Viewing{" "}
                {new Date(`${selectedRecurringDate}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {selectedRecurring.description || "No description."}
            </p>

            {isPortfolioManager && (
              <div className="mt-4">
                {editingRecurring ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted">Start</label>
                      <input
                        type="time"
                        value={recurringStart}
                        onChange={(e) => setRecurringStart(e.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-brand"
                      />
                      <label className="text-xs text-muted">End</label>
                      <input
                        type="time"
                        value={recurringEnd}
                        onChange={(e) => setRecurringEnd(e.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-brand"
                      />
                    </div>
                    {recurringError && <p className="text-xs text-negative">{recurringError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveRecurring}
                        disabled={savingRecurring}
                        className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                      >
                        {savingRecurring ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingRecurring(false)}
                        disabled={savingRecurring}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recurringError && <p className="text-xs text-negative">{recurringError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={openRecurringEdit}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
                      >
                        Edit Time
                      </button>
                      <button
                        onClick={() => setConfirmDeleteRecurring(true)}
                        disabled={savingRecurring}
                        className="rounded-md border border-negative/40 px-3 py-1.5 text-xs font-medium text-negative hover:bg-negative/10 disabled:opacity-60"
                      >
                        {savingRecurring ? "Deleting…" : "Delete This Occurrence"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : selectedEvent ? (
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: selectedEvent.color }}
              />
              <h3 className="text-lg font-semibold text-foreground">{selectedEvent.title}</h3>
            </div>
            <p className="mt-1 text-xs text-muted">
              {new Date(`${selectedEvent.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {formatTimeRange(selectedEvent.startTime, selectedEvent.endTime) &&
                ` · ${formatTimeRange(selectedEvent.startTime, selectedEvent.endTime)}`}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {selectedEvent.description || "No description."}
            </p>

            {selectedEvent.ticker && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Coverage</p>
                {selectedEvent.coveringNames.length > 0 ? (
                  <div className="mt-2 flex flex-col gap-2">
                    {selectedEvent.coveringNames.map((name) => (
                      <Link
                        key={name}
                        href={`/team/${slugifyName(name)}`}
                        className="flex items-center gap-2 text-sm text-foreground hover:text-brand"
                      >
                        <Avatar name={name} size={24} />
                        <span>{name}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted">No one is assigned to {selectedEvent.ticker} yet.</p>
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-muted">Added by {selectedEvent.createdBy}</p>

            {deleteError && <p className="mt-2 text-xs text-negative">{deleteError}</p>}

            {canAdd && (isPortfolioManager || selectedEvent.createdBy === myName) && (
              <button
                onClick={() => handleDelete(selectedEvent.id)}
                disabled={deleting}
                className="mt-4 rounded-md border border-negative/40 px-3 py-1.5 text-xs font-medium text-negative hover:bg-negative/10 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete Event"}
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Click an event on the calendar to see its details here.
          </p>
        )}
      </div>

      {hoverInfo && (
        <div
          className="pointer-events-none fixed z-40 max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: hoverInfo.x, top: hoverInfo.y + 4 }}
        >
          <p className="font-medium text-foreground">{hoverInfo.title}</p>
          {hoverInfo.timeRange && <p className="mt-0.5 text-muted">{hoverInfo.timeRange}</p>}
          {hoverInfo.description && <p className="mt-0.5 text-muted">{hoverInfo.description}</p>}
        </div>
      )}

      {addDate && (
        <AddEventModal
          date={addDate}
          equityOptions={equityOptions}
          onClose={() => setAddDate(null)}
          onCreated={(event) => {
            setEvents((prev) => [...prev, event]);
            setAddDate(null);
          }}
        />
      )}

      {confirmDeleteRecurring && selectedRecurring && selectedRecurringDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center shadow-xl">
            <h2 className="text-lg font-bold text-foreground">
              Are you sure you want to delete &ldquo;{selectedRecurring.title}&rdquo; on{" "}
              {new Date(`${selectedRecurringDate}T00:00:00`).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
              ?
            </h2>
            <p className="mt-1 text-sm text-muted">
              This only removes this single occurrence — the standing weekly {selectedRecurring.title}{" "}
              stays on every other {weekdayName(selectedRecurring.weekday)}. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => handleDeleteRecurring(selectedRecurring.id, selectedRecurringDate)}
                disabled={savingRecurring}
                className="flex-1 rounded-md bg-negative px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {savingRecurring ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirmDeleteRecurring(false)}
                disabled={savingRecurring}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddEventModal({
  date: initialDate,
  equityOptions,
  onClose,
  onCreated,
}: {
  date: string;
  equityOptions: { ticker: string; companyName: string | null }[];
  onClose: () => void;
  onCreated: (event: EnrichedEvent) => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(EVENT_COLOR_OPTIONS[0].value);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isEarnings, setIsEarnings] = useState(false);
  const [ticker, setTicker] = useState(equityOptions[0]?.ticker ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEarningsToggle(checked: boolean) {
    setIsEarnings(checked);
    if (checked) {
      const t = ticker || equityOptions[0]?.ticker || "";
      setTicker(t);
      if (!title.trim() && t) setTitle(`${t} Earnings Call`);
    }
  }

  function handleTickerChange(next: string) {
    setTicker(next);
    if (isEarnings && (!title.trim() || /Earnings Call$/.test(title))) {
      setTitle(`${next} Earnings Call`);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (isEarnings && !ticker) {
      setError("Pick an equity for this earnings call.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          title,
          description,
          color: isEarnings ? EARNINGS_COLOR : color,
          startTime: startTime || null,
          endTime: endTime || null,
          ticker: isEarnings ? ticker : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not save. Try again.");
        return;
      }
      const event: EnrichedEvent = await res.json();
      onCreated(event);
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-bold text-foreground">Add Event</h2>

        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
        />
        <p className="mt-1 text-xs text-muted">
          {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <label className="mt-3 flex items-center gap-2 text-xs font-medium text-muted">
          <input
            type="checkbox"
            checked={isEarnings}
            onChange={(e) => handleEarningsToggle(e.target.checked)}
            disabled={equityOptions.length === 0}
          />
          Earnings call for a watched or held equity
        </label>

        {isEarnings && (
          <select
            value={ticker}
            onChange={(e) => handleTickerChange(e.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          >
            {equityOptions.map((e) => (
              <option key={e.ticker} value={e.ticker}>
                {e.ticker}
                {e.companyName ? ` — ${e.companyName}` : ""}
              </option>
            ))}
          </select>
        )}

        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Earnings call — HCA"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-muted">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-muted">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
            />
          </div>
        </div>

        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional details…"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
        />

        {isEarnings ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: EARNINGS_COLOR }} />
            Color is fixed to red for earnings calls.
          </div>
        ) : (
          <>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
              Color
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {EVENT_COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.label}
                  onClick={() => setColor(c.value)}
                  className={`h-6 w-6 rounded-full ${
                    color === c.value ? "ring-2 ring-brand ring-offset-2 ring-offset-surface" : ""
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </>
        )}

        {error && <p className="mt-2 text-xs text-negative">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
