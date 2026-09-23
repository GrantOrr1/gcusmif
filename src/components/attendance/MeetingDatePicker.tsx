"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Compact popover month calendar — meant for picking a date from a known,
 * sparse set of valid options (here, the season's Monday/Saturday meeting
 * dates), so only cells in `validDates` are clickable; everything else is
 * shown but disabled to keep the calendar's shape recognizable. */
export default function MeetingDatePicker({
  value,
  onChange,
  validDates,
}: {
  value: string;
  onChange: (date: string) => void;
  validDates: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => Number(value.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(value.slice(5, 7)) - 1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function openPicker() {
    setViewYear(Number(value.slice(0, 4)));
    setViewMonth(Number(value.slice(5, 7)) - 1);
    setOpen((o) => !o);
  }

  function goPrev() {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function goNext() {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const total = daysInMonth(viewYear, viewMonth);
    const result: { day: number; dateKey: string | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) result.push({ day: 0, dateKey: null });
    for (let d = 1; d <= total; d++) result.push({ day: d, dateKey: toDateKey(viewYear, viewMonth, d) });
    while (result.length % 7 !== 0) result.push({ day: 0, dateKey: null });
    return result;
  }, [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const buttonLabel = new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={openPicker}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none hover:border-brand focus:border-brand"
      >
        <CalendarIcon />
        {buttonLabel}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous month"
              className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
            >
              ←
            </button>
            <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next month"
              className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
            >
              →
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-muted">
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const isValid = cell.dateKey !== null && validDates.has(cell.dateKey);
              const isSelected = cell.dateKey === value;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!isValid}
                  onClick={() => {
                    if (cell.dateKey) {
                      onChange(cell.dateKey);
                      setOpen(false);
                    }
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    cell.dateKey === null
                      ? "invisible"
                      : isSelected
                        ? "bg-brand font-semibold text-white"
                        : isValid
                          ? "font-medium text-foreground hover:bg-background"
                          : "cursor-default text-muted/30"
                  }`}
                >
                  {cell.day || ""}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
