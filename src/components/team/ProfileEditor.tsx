"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import HeadshotUploader from "@/components/team/HeadshotUploader";

export default function ProfileEditor({
  slug,
  name,
  initialBio,
  initialLinkedinUrl,
  initialEmail,
}: {
  slug: string;
  name: string;
  initialBio: string | null;
  initialLinkedinUrl: string | null;
  initialEmail: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(initialBio ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, bio, linkedinUrl, email }),
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
        className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
      >
        Edit Profile
      </button>
    );
  }

  return (
    <div className="mt-4 max-w-xl rounded-lg border border-border bg-surface p-4 text-left">
      <label className="text-xs font-medium uppercase tracking-wide text-muted">Headshot</label>
      <div className="mt-1">
        <HeadshotUploader slug={slug} name={name} />
      </div>

      <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted">Bio</label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={4}
        placeholder="Write a short bio…"
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
      />

      <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
        LinkedIn URL
      </label>
      <input
        value={linkedinUrl}
        onChange={(e) => setLinkedinUrl(e.target.value)}
        placeholder="https://linkedin.com/in/your-profile"
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
      />

      <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
        Email
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@my.gcu.edu"
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
      />
      <p className="mt-1 text-xs text-muted">Shown as the mail icon next to your name.</p>

      {error && <p className="mt-2 text-xs text-negative">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
