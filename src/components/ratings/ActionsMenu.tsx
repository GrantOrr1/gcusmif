"use client";

import { useEffect, useRef, useState } from "react";

export default function ActionsMenu({
  actions,
}: {
  actions: { label: string; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (actions.length === 0) return <div className="h-8 w-8" />;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Actions"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:border-brand hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-52 rounded-md border border-border bg-surface p-1 shadow-lg">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-background"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
