"use client";

import { useEffect, useState } from "react";
import { hashColor } from "@/lib/colorHash";
import { slugifyName } from "@/lib/team";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function Avatar({
  name,
  photoUrl,
  size = 56,
}: {
  name: string;
  photoUrl?: string;
  size?: number;
}) {
  const [nonce, setNonce] = useState(0);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prevKey, setPrevKey] = useState(`${name}|${photoUrl ?? ""}`);

  useEffect(() => {
    // Attempting the guessed photo URL only after mount means the <img> (and
    // its onError handler) is created client-side, so a 404 always fires
    // onError — an SSR'd <img> can fail before hydration attaches listeners.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const bump = () => {
      setNonce((n) => n + 1);
      setFailed(false);
    };
    window.addEventListener("profile-photo-changed", bump);
    return () => window.removeEventListener("profile-photo-changed", bump);
  }, []);

  const key = `${name}|${photoUrl ?? ""}`;
  if (key !== prevKey) {
    setPrevKey(key);
    setFailed(false);
  }

  const showImg = photoUrl ? true : mounted;
  const src = photoUrl ?? `/api/profile/photo/${slugifyName(name)}${nonce ? `?t=${nonce}` : ""}`;

  if (showImg && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: hashColor(name),
        fontSize: size * 0.36,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
