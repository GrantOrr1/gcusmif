"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/team/Avatar";

const VIEWPORT = 220;
const OUTPUT = 640;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function baseScale(w: number, h: number) {
  return Math.max(VIEWPORT / w, VIEWPORT / h);
}

function maxOffsetFor(scale: number, w: number, h: number) {
  const dispW = w * scale;
  const dispH = h * scale;
  return {
    maxX: Math.max(0, (dispW - VIEWPORT) / 2),
    maxY: Math.max(0, (dispH - VIEWPORT) / 2),
  };
}

function clampOffset(x: number, y: number, scale: number, w: number, h: number) {
  const { maxX, maxY } = maxOffsetFor(scale, w, h);
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

export default function HeadshotUploader({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(
    null
  );

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Image must be PNG, JPEG, or WebP.");
      return;
    }
    setError(null);
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(URL.createObjectURL(file));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y };
  }, [offset]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current || !naturalSize) return;
      const scale = baseScale(naturalSize.w, naturalSize.h) * zoom;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      const next = clampOffset(
        dragState.current.offsetX + dx,
        dragState.current.offsetY + dy,
        scale,
        naturalSize.w,
        naturalSize.h
      );
      setOffset(next);
    },
    [naturalSize, zoom]
  );

  function onPointerUp() {
    dragState.current = null;
  }

  function handleZoomChange(next: number) {
    if (!naturalSize) return;
    const scale = baseScale(naturalSize.w, naturalSize.h) * next;
    setZoom(next);
    setOffset((prev) => clampOffset(prev.x, prev.y, scale, naturalSize.w, naturalSize.h));
  }

  async function handleSave() {
    if (!naturalSize || !imgRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const scale = (baseScale(naturalSize.w, naturalSize.h) * zoom * OUTPUT) / VIEWPORT;
      const destW = naturalSize.w * scale;
      const destH = naturalSize.h * scale;
      const destX = OUTPUT / 2 - destW / 2 + (offset.x * OUTPUT) / VIEWPORT;
      const destY = OUTPUT / 2 - destH / 2 + (offset.y * OUTPUT) / VIEWPORT;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imgRef.current, destX, destY, destW, destH);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95)
      );
      if (!blob) throw new Error("Could not process image");

      const body = new FormData();
      body.set("slug", slug);
      body.set("file", blob, "headshot.jpg");

      const res = await fetch("/api/profile/photo", { method: "POST", body });
      if (!res.ok) {
        setError("Could not save photo. Try again.");
        return;
      }
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
      setNaturalSize(null);
      window.dispatchEvent(new Event("profile-photo-changed"));
      router.refresh();
    } catch {
      setError("Could not save photo. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setNaturalSize(null);
    setError(null);
  }

  if (!imageSrc) {
    return (
      <div className="flex items-center gap-4">
        <Avatar name={name} size={72} />
        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
          >
            Upload Headshot
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          {error && <p className="mt-1 text-xs text-negative">{error}</p>}
        </div>
      </div>
    );
  }

  const scale = naturalSize ? baseScale(naturalSize.w, naturalSize.h) * zoom : 1;
  const { maxX, maxY } = naturalSize ? maxOffsetFor(scale, naturalSize.w, naturalSize.h) : { maxX: 0, maxY: 0 };

  return (
    <div>
      <div
        className="relative touch-none overflow-hidden rounded-full border border-border bg-background"
        style={{ width: VIEWPORT, height: VIEWPORT, cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Headshot preview"
          onLoad={handleImgLoad}
          draggable={false}
          className="absolute select-none"
          style={
            naturalSize
              ? {
                  width: naturalSize.w * scale,
                  height: naturalSize.h * scale,
                  maxWidth: "none",
                  maxHeight: "none",
                  left: VIEWPORT / 2 - (naturalSize.w * scale) / 2 + offset.x,
                  top: VIEWPORT / 2 - (naturalSize.h * scale) / 2 + offset.y,
                }
              : { maxWidth: "none", maxHeight: "none" }
          }
        />
      </div>

      <div className="mt-2 flex items-center gap-2" style={{ width: VIEWPORT }}>
        <span className="w-8 shrink-0 text-xs text-muted">Zoom</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          className="flex-1"
        />
      </div>

      <div className="mt-1 flex items-center gap-2" style={{ width: VIEWPORT }}>
        <span className="w-8 shrink-0 text-xs text-muted">X</span>
        <input
          type="range"
          min={-maxX}
          max={maxX}
          step={0.5}
          value={offset.x}
          disabled={maxX === 0}
          onChange={(e) => setOffset((prev) => ({ ...prev, x: Number(e.target.value) }))}
          className="flex-1 disabled:opacity-40"
        />
      </div>

      <div className="mt-1 flex items-center gap-2" style={{ width: VIEWPORT }}>
        <span className="w-8 shrink-0 text-xs text-muted">Y</span>
        <input
          type="range"
          min={-maxY}
          max={maxY}
          step={0.5}
          value={offset.y}
          disabled={maxY === 0}
          onChange={(e) => setOffset((prev) => ({ ...prev, y: Number(e.target.value) }))}
          className="flex-1 disabled:opacity-40"
        />
      </div>

      <p className="mt-1 text-[11px] text-muted" style={{ width: VIEWPORT }}>
        Drag the photo to reposition, or use the sliders.
      </p>

      {error && <p className="mt-2 text-xs text-negative">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !naturalSize}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Photo"}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
