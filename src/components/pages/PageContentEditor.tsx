"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PageContentEditor({
  slug,
  initialContent,
}: {
  slug: string;
  initialContent: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        setError("Could not save. Try again.");
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
        className="mt-4 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
      >
        Edit Page
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4">
      <label className="text-xs font-medium uppercase tracking-wide text-muted">
        Page Content
      </label>
      <p className="mt-1 text-xs text-muted">Separate paragraphs with a blank line.</p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={16}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
      />

      {error && <p className="mt-2 text-xs text-negative">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => {
            setContent(initialContent);
            setEditing(false);
            setError(null);
          }}
          disabled={saving}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
