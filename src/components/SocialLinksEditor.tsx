"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SocialLinksEditor({
  initialInstagram,
  initialLinkedin,
}: {
  initialInstagram: string | null;
  initialLinkedin: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [instagram, setInstagram] = useState(initialInstagram ?? "");
  const [linkedin, setLinkedin] = useState(initialLinkedin ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/social-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram, linkedin }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not save. Try again.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-[11px] font-medium text-muted underline-offset-2 hover:text-brand hover:underline"
      >
        Edit links
      </button>
    );
  }

  return (
    <div className="w-full max-w-xs rounded-lg border border-border bg-background p-3 sm:w-64">
      <label className="block text-[11px] font-medium uppercase tracking-wide text-muted">
        Instagram URL
      </label>
      <input
        value={instagram}
        onChange={(e) => setInstagram(e.target.value)}
        placeholder="https://instagram.com/yourfund"
        className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand"
      />

      <label className="mt-2 block text-[11px] font-medium uppercase tracking-wide text-muted">
        LinkedIn URL
      </label>
      <input
        value={linkedin}
        onChange={(e) => setLinkedin(e.target.value)}
        placeholder="https://linkedin.com/company/yourfund"
        className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand"
      />

      {error && <p className="mt-2 text-[11px] text-negative">{error}</p>}

      <div className="mt-2 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
