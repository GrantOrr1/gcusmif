"use client";

import { useId } from "react";

// Original engraved-style portrait (banknote / newspaper etching look), drawn as
// individual strokes so it can sketch itself in. Strokes draw in the order listed.
type Stroke = { d: string; w?: number; o?: number };

const STROKES: Stroke[] = [
  // face contour, jowls, chin
  { d: "M112,118 C110,140 111,160 114,178 C117,196 124,210 134,220 C140,226 145,229 150,230", w: 1.8 },
  { d: "M188,118 C190,140 189,160 186,178 C183,196 176,210 166,220 C160,226 155,229 150,230", w: 1.8 },
  { d: "M122,200 C126,212 132,219 138,223", w: 1, o: 0.6 },
  { d: "M178,200 C174,212 168,219 162,223", w: 1, o: 0.6 },
  { d: "M144,216 C148,218 152,218 156,216", w: 0.9, o: 0.6 },
  // ears
  { d: "M112,136 C104,132 101,140 102,150 C103,160 107,166 114,166", w: 1.5 },
  { d: "M108,142 C106,148 107,155 110,159", w: 0.9, o: 0.6 },
  { d: "M188,136 C196,132 199,140 198,150 C197,160 193,166 186,166", w: 1.5 },
  { d: "M192,142 C194,148 193,155 190,159", w: 0.9, o: 0.6 },
  // hair: crown, receding hairline, swept-back strands
  { d: "M110,124 C106,96 124,70 150,68 C176,70 194,96 190,124", w: 1.6 },
  { d: "M118,112 C124,98 136,92 150,92 C164,92 176,98 182,112", w: 1, o: 0.55 },
  { d: "M122,104 C126,90 136,80 148,76", w: 0.8, o: 0.55 },
  { d: "M130,99 C134,88 142,80 152,77", w: 0.8, o: 0.55 },
  { d: "M140,95 C144,86 150,80 158,78", w: 0.8, o: 0.55 },
  { d: "M156,94 C162,86 170,82 176,84", w: 0.8, o: 0.55 },
  { d: "M166,97 C172,90 178,88 184,92", w: 0.8, o: 0.55 },
  { d: "M114,118 C112,104 116,92 124,84", w: 0.8, o: 0.55 },
  { d: "M186,118 C188,104 184,92 176,84", w: 0.8, o: 0.55 },
  { d: "M110,130 C106,120 108,111 114,106", w: 0.9, o: 0.7 },
  { d: "M108,136 C104,128 105,121 110,116", w: 0.9, o: 0.7 },
  { d: "M190,130 C194,120 192,111 186,106", w: 0.9, o: 0.7 },
  { d: "M192,136 C196,128 195,121 190,116", w: 0.9, o: 0.7 },
  // forehead lines
  { d: "M132,106 C142,103 158,103 168,106", w: 0.8, o: 0.5 },
  { d: "M136,113 C145,111 155,111 164,113", w: 0.8, o: 0.45 },
  // eyebrows: brow line + hatched hairs
  { d: "M119,127 C127,121 137,120 145,124", w: 1.4 },
  { d: "M121,127 L128,122 M125,126 L133,121 M130,125 L138,121 M135,125 L143,122", w: 0.9, o: 0.75 },
  { d: "M181,127 C173,121 163,120 155,124", w: 1.4 },
  { d: "M179,127 L172,122 M175,126 L167,121 M170,125 L162,121 M165,125 L157,122", w: 0.9, o: 0.75 },
  // glasses: heavy frames
  { d: "M117,134 C117,129 121,128 133,128 C145,128 147,129 147,134 L147,146 C147,154 143,157 133,157 C121,157 117,154 117,146 Z", w: 2.4 },
  { d: "M153,134 C153,129 155,128 167,128 C179,128 183,129 183,134 L183,146 C183,154 179,157 167,157 C157,157 153,154 153,146 Z", w: 2.4 },
  { d: "M147,136 C149,133 151,133 153,136", w: 1.8 },
  { d: "M117,135 L110,133 M183,135 L190,133", w: 1.8 },
  // eyes
  { d: "M124,143 C128,139 136,139 140,143", w: 1.2 },
  { d: "M125,146 C130,148 135,148 139,146", w: 0.8, o: 0.6 },
  { d: "M160,143 C164,139 172,139 176,143", w: 1.2 },
  { d: "M161,146 C166,148 171,148 175,146", w: 0.8, o: 0.6 },
  { d: "M125,152 C129,154 135,154 139,152 M161,152 C165,154 171,154 175,152", w: 0.7, o: 0.45 },
  { d: "M117,160 C121,162 125,162 128,161 M183,160 C179,162 175,162 172,161", w: 0.8, o: 0.5 },
  // nose
  { d: "M145,152 C144,161 141,168 140,174", w: 1.1, o: 0.8 },
  { d: "M157,158 C158,165 159,170 160,174", w: 0.8, o: 0.5 },
  { d: "M140,174 C142,178 146,179 148,177 M152,177 C154,179 158,178 160,174", w: 1.1 },
  { d: "M146,178 C148,180 152,180 154,178", w: 0.8, o: 0.6 },
  // smile lines + mouth
  { d: "M138,177 C132,185 130,193 132,200", w: 1, o: 0.7 },
  { d: "M162,177 C168,185 170,193 168,200", w: 1, o: 0.7 },
  { d: "M134,196 C140,201 160,201 166,196", w: 1.4 },
  { d: "M141,204 C146,206 154,206 159,204", w: 0.8, o: 0.6 },
  // neck
  { d: "M136,222 C136,230 136,236 134,242 M164,222 C164,230 164,236 166,242", w: 1.3 },
  { d: "M144,233 C148,235 152,235 156,233", w: 0.7, o: 0.45 },
  // collar + tie
  { d: "M134,242 L146,262 L150,254 L154,262 L166,242", w: 1.3 },
  { d: "M145,258 L155,258 L153,268 L147,268 Z", w: 1.2 },
  { d: "M147,268 L141,322 L150,334 L159,322 L153,268", w: 1.2 },
  // jacket: shoulders and lapels
  { d: "M134,242 C110,250 80,262 66,290 C58,306 56,330 56,360", w: 1.6 },
  { d: "M166,242 C190,250 220,262 234,290 C242,306 244,330 244,360", w: 1.6 },
  { d: "M134,242 L123,270 L136,277 L146,350", w: 1.3 },
  { d: "M166,242 L177,270 L164,277 L154,350", w: 1.3 },
  { d: "M123,270 L130,266 M177,270 L170,266", w: 1, o: 0.7 },
  { d: "M190,304 L212,299", w: 1, o: 0.6 },
];

// Parallel hatch lines across a box; clipped to a shape to make engraving-style shading.
function hatch(x0: number, y0: number, x1: number, y1: number, gap: number, slant: number) {
  let d = "";
  for (let x = x0 - (y1 - y0) * slant; x <= x1; x += gap) {
    d += `M${x.toFixed(1)},${y1} L${(x + (y1 - y0) * slant).toFixed(1)},${y0} `;
  }
  return d;
}

const FACE = "M112,118 C110,140 111,160 114,178 C117,196 124,210 134,220 C140,226 145,229 150,230 C155,229 160,226 166,220 C176,210 183,196 186,178 C189,160 190,140 188,118 C188,100 172,90 150,90 C128,90 112,100 112,118 Z";
const JACKET_LEFT = "M134,242 C110,250 80,262 66,290 C58,306 56,330 56,360 L146,360 L136,277 L123,270 Z";
const JACKET_RIGHT = "M166,242 C190,250 220,262 234,290 C242,306 244,330 244,360 L154,360 L164,277 L177,270 Z";
const TIE = "M145,258 L155,258 L153,268 L159,322 L150,334 L141,322 L147,268 Z";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Maps overall progress into a 0..1 window between `from` and `to`. */
const seg = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

const STROKE_SPAN = 0.22; // share of the timeline each stroke takes to draw

/**
 * `progress` (0..1) drives the whole drawing, so a parent can scrub it with scroll.
 * Strokes draw in order; frame, shading, eyes and nameplate fade in at set points.
 */
export default function BuffettPortrait({ progress }: { progress: number }) {
  const uid = useId().replace(/:/g, "");
  const n = STROKES.length;
  const fade = (from: number, to: number, max = 1) => ({ opacity: seg(progress, from, to) * max });

  return (
    <div className="relative mx-auto w-full max-w-[400px]">
      <svg viewBox="16 40 268 330" className="w-full" role="img" aria-label="Engraved-style portrait of Warren Buffett">
        <defs>
          <clipPath id={`oval-${uid}`}>
            <ellipse cx="150" cy="205" rx="122" ry="152" />
          </clipPath>
          <clipPath id={`face-${uid}`}>
            <path d={FACE} />
          </clipPath>
          <clipPath id={`jl-${uid}`}>
            <path d={JACKET_LEFT} />
          </clipPath>
          <clipPath id={`jr-${uid}`}>
            <path d={JACKET_RIGHT} />
          </clipPath>
          <clipPath id={`tie-${uid}`}>
            <path d={TIE} />
          </clipPath>
        </defs>

        {/* frame: double rule with a fine guilloche-style dotted ring */}
        <g fill="none" style={fade(0, 0.12)}>
          <ellipse cx="150" cy="205" rx="130" ry="160" stroke="var(--muted)" strokeOpacity="0.5" strokeWidth="0.8" />
          <ellipse cx="150" cy="205" rx="126" ry="156" stroke="var(--brand)" strokeOpacity="0.45" strokeWidth="2.2" strokeDasharray="0.6 2.4" strokeLinecap="round" />
          <ellipse cx="150" cy="205" rx="122" ry="152" stroke="var(--muted)" strokeOpacity="0.5" strokeWidth="0.8" />
        </g>

        <g clipPath={`url(#oval-${uid})`}>
          {/* background: fine horizontal engraving lines */}
          <path
            d={Array.from({ length: 80 }, (_, i) => `M20,${54 + i * 4} L280,${54 + i * 4}`).join(" ")}
            stroke="var(--muted)"
            strokeWidth="0.5"
            style={fade(0.04, 0.2, 0.22)}
          />
          {/* solid figure so background lines stay behind him */}
          <g fill="var(--background)" style={fade(0.04, 0.2)}>
            <path d="M134,242 C110,250 80,262 66,290 C58,306 56,330 56,360 L244,360 C244,330 242,306 234,290 C220,262 190,250 166,242 Z" />
            <rect x="134" y="215" width="32" height="30" />
            <path d="M110,124 C106,96 124,70 150,68 C176,70 194,96 190,124 L190,140 C198,134 200,160 188,166 C184,196 176,214 150,230 C124,214 116,196 112,166 C100,160 102,134 110,140 Z" />
          </g>

          {/* shading: hatching on the shadow side of the face, jacket and tie */}
          <g stroke="var(--foreground)" fill="none" style={fade(0.8, 0.97)}>
            <path d={hatch(108, 150, 128, 228, 3.2, 0.35)} strokeWidth="0.55" strokeOpacity="0.4" clipPath={`url(#face-${uid})`} />
            <path d={hatch(108, 112, 122, 150, 3.4, 0.35)} strokeWidth="0.5" strokeOpacity="0.3" clipPath={`url(#face-${uid})`} />
            <path d={hatch(50, 240, 146, 362, 3, 0.6)} strokeWidth="0.6" strokeOpacity="0.55" clipPath={`url(#jl-${uid})`} />
            <path d={hatch(150, 240, 250, 362, 4.2, 0.6)} strokeWidth="0.55" strokeOpacity="0.35" clipPath={`url(#jr-${uid})`} />
            <path d={hatch(138, 256, 162, 336, 3, -0.7)} strokeWidth="0.7" strokeOpacity="0.6" clipPath={`url(#tie-${uid})`} />
          </g>

          {/* line work */}
          {STROKES.map((s, i) => {
            const start = (i / (n - 1)) * (1 - STROKE_SPAN) * 0.88;
            const t = seg(progress, start, start + STROKE_SPAN);
            return (
              <path
                key={i}
                d={s.d}
                fill="none"
                stroke="var(--foreground)"
                strokeOpacity={s.o ?? 0.95}
                strokeWidth={s.w ?? 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={1 - t}
                // Round line caps render as dots even on an undrawn stroke, so
                // keep each stroke hidden until its turn to draw.
                style={{ visibility: t > 0.001 ? "visible" : "hidden" }}
              />
            );
          })}

          {/* irises */}
          <g fill="var(--foreground)" style={fade(0.86, 0.95)}>
            <circle cx="132" cy="143" r="2.3" />
            <circle cx="168" cy="143" r="2.3" />
          </g>
        </g>

        {/* nameplate */}
        <g style={fade(0.92, 1)}>
          <rect x="88" y="346" width="124" height="20" rx="2" fill="var(--background)" stroke="var(--muted)" strokeOpacity="0.6" strokeWidth="0.8" />
          <text x="150" y="360" textAnchor="middle" fontSize="9" letterSpacing="2.4" fill="var(--foreground)" style={{ fontFamily: "var(--font-geist-sans)" }}>
            WARREN BUFFETT
          </text>
        </g>
      </svg>
    </div>
  );
}
