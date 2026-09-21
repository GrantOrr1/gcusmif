"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Slide = {
  src: string;
  alt: string;
  objectPosition?: string;
};

const INTERVAL_MS = 4000;
const TRANSITION_MS = 1000;

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  // A clone of the first slide is appended so the last -> first wrap can
  // slide in the same direction instead of snapping backwards.
  const extended = [...slides, slides[0]];
  const [index, setIndex] = useState(0);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => i + 1);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (index !== slides.length) return;
    const timeout = setTimeout(() => {
      setInstant(true);
      setIndex(0);
    }, TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [index, slides.length]);

  useEffect(() => {
    if (!instant) return;
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setInstant(false));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [instant]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className={`flex h-full ${instant ? "" : "transition-transform ease-in-out"}`}
        style={{
          width: `${extended.length * 100}%`,
          transform: `translateX(-${index * (100 / extended.length)}%)`,
          transitionDuration: instant ? "0ms" : `${TRANSITION_MS}ms`,
        }}
      >
        {extended.map((slide, i) => (
          <div
            key={`${slide.src}-${i}`}
            className="relative h-full shrink-0"
            style={{ width: `${100 / extended.length}%` }}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: slide.objectPosition ?? "center" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
