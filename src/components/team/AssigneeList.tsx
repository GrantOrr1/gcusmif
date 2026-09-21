"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/team/Avatar";
import { slugifyName } from "@/lib/team";

export default function AssigneeList({
  names,
  avatarSize = 18,
  maxShown = 2,
}: {
  names: string[];
  avatarSize?: number;
  /** How many names to show before collapsing the rest into a "+N" badge. */
  maxShown?: number;
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

  if (names.length === 0) {
    return <span className="text-xs text-muted">Unassigned</span>;
  }

  const shown = names.slice(0, maxShown);
  const overflow = names.length - shown.length;

  return (
    <div ref={ref} className="relative flex flex-wrap items-center gap-x-3 gap-y-1">
      {shown.map((name) => (
        <Link
          key={name}
          href={`/team/${slugifyName(name)}`}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-brand"
        >
          <Avatar name={name} size={avatarSize} />
          <span className="truncate">{name}</span>
        </Link>
      ))}
      {overflow > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`rounded px-1 text-xs font-medium ${
            open ? "bg-background text-brand" : "text-muted hover:text-brand"
          }`}
        >
          +{overflow}
        </button>
      )}

      {open && overflow > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border border-border bg-surface p-2 shadow-lg">
          <ul className="space-y-1">
            {names.map((name) => (
              <li key={name}>
                <Link
                  href={`/team/${slugifyName(name)}`}
                  className="flex items-center gap-1.5 rounded px-1 py-0.5 text-xs text-foreground hover:bg-background hover:text-brand"
                >
                  <Avatar name={name} size={16} />
                  <span className="truncate">{name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
