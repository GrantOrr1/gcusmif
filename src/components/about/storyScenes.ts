// Sketch scenes for the "analyst journey" story on the About page.
// Every drawing is built from plain SVG strokes so it can draw itself in.
// Canvas for every scene: viewBox 0 0 400 300, floor at y = 262.

export type Tone = "ink" | "soft" | "brand";
export type Stroke = { d: string; w?: number; o?: number; tone?: Tone; fill?: boolean };
export type Label = {
  x: number;
  y: number;
  text: string;
  size?: number;
  tone?: Tone;
  weight?: number;
  anchor?: "start" | "middle";
};
export type Scene = {
  key: string;
  short: string;
  title: string;
  body: string;
  strokes: Stroke[];
  labels?: Label[];
};

const f = (n: number) => Number(n.toFixed(1));
const P = (...pts: [number, number][]) => "M" + pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" L");
const circle = (cx: number, cy: number, r: number) =>
  `M${f(cx - r)},${f(cy)} a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0 a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0`;
const rect = (x: number, y: number, w: number, h: number) => `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`;

const soft = (d: string, w = 0.8): Stroke => ({ d, w, tone: "soft" });
const floor = soft(P([16, 262], [384, 262]), 1);

type Arms = "down" | "hold" | "present";

/** A standing figure, feet at (x, g), roughly 130px tall at scale 1. */
function standing(x: number, g: number, s: number, arms: Arms): Stroke[] {
  const X = (k: number) => f(x + k * s);
  const Y = (k: number) => f(g - k * s);
  const out: Stroke[] = [
    // legs + shoes
    { d: `M${X(-16)},${Y(56)} L${X(-15)},${Y(0)} M${X(-2)},${Y(50)} L${X(-4)},${Y(0)}`, w: 1.3 },
    { d: `M${X(2)},${Y(50)} L${X(4)},${Y(0)} M${X(16)},${Y(56)} L${X(15)},${Y(0)}`, w: 1.3 },
    { d: `M${X(-2)},${Y(50)} Q${x},${Y(54)} ${X(2)},${Y(50)}`, w: 1 },
    { d: `M${X(-17)},${Y(0)} L${X(-3)},${Y(0)} M${X(3)},${Y(0)} L${X(17)},${Y(0)}`, w: 2 },
    // torso
    {
      d: `M${X(-20)},${Y(56)} L${X(-21)},${Y(92)} C${X(-19)},${Y(99)} ${X(-9)},${Y(101)} ${x},${Y(101)} C${X(9)},${Y(101)} ${X(19)},${Y(99)} ${X(21)},${Y(92)} L${X(20)},${Y(56)} Z`,
      w: 1.4,
      fill: true,
    },
  ];
  // arms
  const left = {
    down: `M${X(-21)},${Y(92)} C${X(-26)},${Y(80)} ${X(-26)},${Y(68)} ${X(-24)},${Y(58)}`,
    hold: `M${X(-21)},${Y(92)} C${X(-24)},${Y(80)} ${X(-18)},${Y(72)} ${X(-8)},${Y(74)}`,
    present: `M${X(-21)},${Y(92)} C${X(-26)},${Y(80)} ${X(-26)},${Y(68)} ${X(-24)},${Y(58)}`,
  }[arms];
  const right = {
    down: `M${X(21)},${Y(92)} C${X(26)},${Y(80)} ${X(26)},${Y(68)} ${X(24)},${Y(58)}`,
    hold: `M${X(21)},${Y(92)} C${X(24)},${Y(80)} ${X(18)},${Y(72)} ${X(8)},${Y(74)}`,
    present: `M${X(21)},${Y(92)} C${X(34)},${Y(94)} ${X(46)},${Y(100)} ${X(56)},${Y(108)}`,
  }[arms];
  out.push({ d: left, w: 1.3 }, { d: right, w: 1.3 });
  out.push(
    { d: `M${X(-3)},${Y(107)} L${X(-3)},${Y(101)} M${X(3)},${Y(107)} L${X(3)},${Y(101)}`, w: 1.1 },
    { d: circle(x, g - 118 * s, 11 * s), w: 1.4, fill: true },
    { d: `M${X(-11)},${Y(118)} C${X(-12)},${Y(133)} ${X(12)},${Y(133)} ${X(11)},${Y(118)}`, w: 1.3 },
    soft(`M${X(-9)},${Y(124)} C${X(-4)},${Y(128)} ${X(4)},${Y(129)} ${X(10)},${Y(124)}`),
    soft(`M${X(-6)},${Y(101)} L${x},${Y(93)} L${X(6)},${Y(101)}`),
  );
  return out;
}

type BustArms = "type" | "none" | "gesture";

/** Head and shoulders seated behind a desk whose top edge is at y = desk. */
function bust(x: number, desk: number, s: number, arms: BustArms): Stroke[] {
  const X = (k: number) => f(x + k * s);
  const D = (k: number) => f(desk - k * s);
  const out: Stroke[] = [
    {
      d: `M${X(-20)},${desk} L${X(-21)},${D(36)} C${X(-19)},${D(43)} ${X(-9)},${D(45)} ${x},${D(45)} C${X(9)},${D(45)} ${X(19)},${D(43)} ${X(21)},${D(36)} L${X(20)},${desk}`,
      w: 1.4,
      fill: true,
    },
  ];
  if (arms === "type") {
    out.push(
      { d: `M${X(-21)},${D(36)} C${X(-27)},${D(22)} ${X(-24)},${D(8)} ${X(-12)},${D(3)}`, w: 1.3 },
      { d: `M${X(21)},${D(36)} C${X(27)},${D(22)} ${X(24)},${D(8)} ${X(12)},${D(3)}`, w: 1.3 },
    );
  } else if (arms === "gesture") {
    out.push(
      { d: `M${X(-21)},${D(36)} C${X(-24)},${D(24)} ${X(-23)},${D(12)} ${X(-22)},${D(2)}`, w: 1.3 },
      { d: `M${X(21)},${D(36)} C${X(30)},${D(40)} ${X(36)},${D(52)} ${X(40)},${D(64)}`, w: 1.3 },
    );
  } else {
    out.push(
      { d: `M${X(-21)},${D(36)} C${X(-24)},${D(24)} ${X(-23)},${D(12)} ${X(-22)},${D(2)}`, w: 1.3 },
      { d: `M${X(21)},${D(36)} C${X(24)},${D(24)} ${X(23)},${D(12)} ${X(22)},${D(2)}`, w: 1.3 },
    );
  }
  out.push(
    { d: `M${X(-3)},${D(50)} L${X(-3)},${D(45)} M${X(3)},${D(50)} L${X(3)},${D(45)}`, w: 1.1 },
    { d: circle(x, desk - 61 * s, 11 * s), w: 1.4, fill: true },
    { d: `M${X(-11)},${D(61)} C${X(-12)},${D(76)} ${X(12)},${D(76)} ${X(11)},${D(61)}`, w: 1.3 },
    soft(`M${X(-6)},${D(45)} L${x},${D(38)} L${X(6)},${D(45)}`),
  );
  return out;
}

/** Back of a seated audience member: shoulders then head. */
function audienceMember(x: number, y: number, s: number): Stroke[] {
  return [
    {
      d: `M${f(x - 16 * s)},${f(y + 26 * s)} C${f(x - 15 * s)},${f(y + 14 * s)} ${f(x - 8 * s)},${f(y + 10 * s)} ${f(x)},${f(y + 10 * s)} C${f(x + 8 * s)},${f(y + 10 * s)} ${f(x + 15 * s)},${f(y + 14 * s)} ${f(x + 16 * s)},${f(y + 26 * s)} Z`,
      w: 1.1,
      fill: true,
    },
    { d: circle(x, y, 9 * s), w: 1.1, fill: true },
  ];
}

// ---------------------------------------------------------------- scenes

const apply: Scene = (() => {
  const cols = [58, 91, 125, 159, 192];
  return {
    key: "apply",
    short: "Apply",
    title: "Apply.",
    body: "It starts with a formatted resume and a short equity report on a company we assign you.",
    strokes: [
      floor,
      { d: "M40,112 L125,72 L210,112 Z", w: 1.4 },
      soft("M64,106 L125,80 L186,106 Z"),
      { d: rect(40, 112, 170, 12), w: 1.2 },
      ...cols.flatMap((c) => [
        { d: `${P([c - 5, 124], [c - 5, 236])} ${P([c + 5, 124], [c + 5, 236])}`, w: 1.1 },
        soft(P([c - 8, 128], [c + 8, 128])),
      ]),
      { d: P([34, 236], [216, 236]), w: 1.2 },
      { d: P([28, 246], [222, 246]), w: 1.1 },
      { d: P([22, 255], [228, 255]), w: 1 },
      soft(circle(332, 64, 14)),
      soft("M286,58 q6,-6 12,0 q6,-6 12,0"),
      soft("M314,90 q5,-5 10,0 q5,-5 10,0"),
      ...standing(292, 262, 1, "hold"),
      { d: rect(272, 174, 40, 30), w: 1.2, fill: true },
      soft(`${P([278, 190], [306, 190])} ${P([278, 195], [302, 195])} ${P([278, 200], [306, 200])}`),
    ],
    labels: [{ x: 292, y: 184, text: "RESUME", size: 6, weight: 700 }],
  };
})();

const research: Scene = {
  key: "research",
  short: "Research",
  title: "Dig into the filings.",
  body: "Annual reports, 10-Ks and earnings calls. Due diligence means understanding the business from A to Z.",
  strokes: [
    floor,
    { d: rect(56, 36, 84, 84), w: 1, o: 0.7 },
    soft(`${P([98, 36], [98, 120])} ${P([56, 78], [140, 78])}`),
    ...bust(200, 200, 1, "type"),
    { d: P([40, 200], [360, 200]), w: 1.6 },
    { d: P([40, 200], [40, 207], [360, 207], [360, 200]), w: 1.2 },
    { d: `${P([54, 207], [54, 262])} ${P([346, 207], [346, 262])}`, w: 1.2 },
    { d: "M164,199 L198,193 L198,181 L164,187 Z", w: 1.1, fill: true },
    { d: "M236,199 L202,193 L202,181 L236,187 Z", w: 1.1, fill: true },
    soft(`${P([170, 190], [192, 186])} ${P([170, 195], [192, 191])} ${P([208, 186], [230, 190])} ${P([208, 191], [230, 195])}`, 0.6),
    { d: rect(66, 176, 76, 12), w: 1.1, fill: true },
    { d: rect(70, 164, 68, 12), w: 1.1, fill: true },
    { d: rect(64, 152, 72, 12), w: 1.1, fill: true },
    { d: P([292, 200], [316, 200]), w: 1.4 },
    { d: P([304, 200], [304, 152], [322, 132]), w: 1.3 },
    { d: "M310,130 L336,122 L342,138 L318,146 Z", w: 1.2, fill: true },
    soft(`${P([322, 146], [306, 196])} ${P([340, 138], [354, 196])}`, 0.6),
    { d: "M254,200 L254,184 L268,184 L268,200 M268,188 C275,188 275,197 268,197", w: 1.2 },
    soft("M258,180 C254,174 262,170 258,164 M264,180 C260,174 268,170 264,164"),
  ],
  labels: [
    { x: 100, y: 161, text: "10-K", size: 7, weight: 700 },
    { x: 104, y: 173, text: "10-Q", size: 7, weight: 700 },
    { x: 104, y: 185, text: "ANNUAL REPORT", size: 5.5, weight: 700 },
  ],
};

const model: Scene = (() => {
  const rows = Array.from({ length: 10 }, (_, i) => P([110, 74 + i * 10], [226, 74 + i * 10])).join(" ");
  const cols = [138, 160, 182, 204].map((x) => P([x, 64], [x, 164])).join(" ");
  return {
    key: "model",
    short: "Model",
    title: "Build the DCF.",
    body: "Forecast the free cash flows in Excel, discount them back to today, and arrive at an intrinsic value.",
    strokes: [
      { d: P([40, 206], [360, 206]), w: 1.6 },
      { d: rect(96, 48, 208, 132), w: 1.8, fill: true },
      soft(rect(104, 56, 192, 116), 0.7),
      { d: `${P([192, 180], [188, 204])} ${P([208, 180], [212, 204])}`, w: 1.2 },
      { d: "M172,206 C180,201 220,201 228,206", w: 1.2 },
      { d: `${P([110, 64], [226, 64])} ${P([110, 64], [110, 164])} ${P([226, 64], [226, 164])}`, w: 0.9 },
      soft(rows, 0.5),
      soft(cols, 0.5),
      { d: rect(182, 124, 22, 10), w: 1.3, tone: "brand" },
      soft(`${P([236, 160], [290, 160])} ${P([236, 160], [236, 70])}`, 0.7),
      { d: rect(242, 138, 10, 22), w: 1.2, tone: "brand" },
      { d: rect(256, 124, 10, 36), w: 1.2, tone: "brand" },
      { d: rect(270, 108, 10, 52), w: 1.2, tone: "brand" },
      soft(P([238, 100], [290, 100]), 0.6),
      { d: "M66,206 L72,190 L118,190 L112,206 Z", w: 1, fill: true },
      soft(`${P([78, 196], [110, 196])} ${P([76, 201], [108, 201])}`, 0.6),
      { d: P([126, 204], [142, 190]), w: 1.2 },
      { d: "M312,206 L312,190 L326,190 L326,206 M326,194 C332,194 332,202 326,202", w: 1.2 },
      { d: `${P([191, 232], [191, 244])} ${P([209, 232], [209, 244])}`, w: 1.1 },
      { d: "M136,300 C138,262 164,247 186,243 L214,243 C236,247 262,262 264,300", w: 1.5, fill: true },
      { d: circle(200, 220, 15), w: 1.5, fill: true },
      soft("M190,211 C196,205 204,205 210,211 M187,224 C193,229 207,229 213,224"),
      { d: "M185,218 C181,216 181,225 185,227 M215,218 C219,216 219,225 215,227", w: 1 },
    ],
    labels: [
      { x: 168, y: 71.5, text: "DCF MODEL", size: 6, weight: 700 },
      { x: 263, y: 97, text: "INTRINSIC", size: 5.5, tone: "soft", weight: 600 },
    ],
  };
})();


const report: Scene = (() => {
  const sections = [
    { y: 66, label: "COMPANY OVERVIEW" },
    { y: 100, label: "MOAT" },
    { y: 134, label: "CATALYSTS" },
    { y: 168, label: "VALUATION" },
  ];
  return {
    key: "report",
    short: "Report",
    title: "Write the equity report.",
    body: "Overview, industry, moat, catalysts, valuation and thesis, written up clearly enough for anyone in the fund to follow.",
    strokes: [
      floor,
      ...bust(108, 214, 1, "type"),
      { d: P([30, 214], [370, 214]), w: 1.6 },
      { d: `${P([44, 214], [44, 262])} ${P([356, 214], [356, 262])}`, w: 1.2 },
      { d: "M82,212 L88,180 L128,180 L134,212 Z", w: 1.2, fill: true },
      soft(circle(108, 196, 3), 0.8),
      { d: "M204,28 L332,28 L352,48 L352,206 L204,206 Z", w: 1.4, fill: true },
      { d: P([332, 28], [332, 48], [352, 48]), w: 1 },
      { d: P([216, 50], [340, 50]), w: 0.8 },
      ...sections.flatMap(({ y }) => [
        soft(`${P([216, y + 9], [340, y + 9])} ${P([216, y + 15], [334, y + 15])} ${P([216, y + 21], [322, y + 21])}`, 0.55),
      ]),
      { d: rect(296, 176, 40, 20), w: 0.9 },
      { d: P([300, 192], [310, 186], [318, 189], [332, 180]), w: 1.1, tone: "brand" },
      { d: P([166, 212], [186, 196]), w: 1.6, tone: "brand" },
      { d: rect(150, 186, 22, 20), w: 1, fill: true },
      soft(`${P([154, 193], [168, 193])} ${P([154, 198], [164, 198])}`, 0.6),
    ],
    labels: [
      { x: 216, y: 44, text: "EQUITY REPORT", size: 7.5, weight: 800, anchor: "start" },
      ...sections.map(({ y, label }) => ({ x: 216, y: y + 2, text: label, size: 5.5, weight: 700, tone: "brand" as const, anchor: "start" as const })),
    ],
  };
})();

const deck: Scene = (() => {
  const thumbs = [0, 1, 2, 3];
  return {
    key: "deck",
    short: "Deck",
    title: "Build the pitch deck.",
    body: "Turn the research and the model into a handful of clean, readable slides that make the case.",
    strokes: [
      { d: P([36, 252], [364, 252]), w: 1.2, tone: "soft" },
      { d: rect(70, 30, 260, 150), w: 1.6, fill: true },
      { d: P([88, 60], [196, 60]), w: 3, tone: "brand" },
      ...[84, 104, 124].flatMap((y) => [
        { d: circle(92, y, 2.2), w: 1 } as Stroke,
        soft(`${P([100, y], [176, y])} ${P([100, y + 6], [160, y + 6])}`, 0.6),
      ]),
      soft(`${P([204, 160], [312, 160])} ${P([204, 160], [204, 76])}`, 0.7),
      { d: rect(214, 128, 16, 32), w: 1.2 },
      { d: rect(240, 112, 16, 48), w: 1.2 },
      { d: rect(266, 92, 16, 68), w: 1.2, tone: "brand" },
      { d: "M286,96 L300,80 M292,80 L300,80 L300,88", w: 1.4, tone: "brand" },
      ...thumbs.map((k): Stroke => ({ d: rect(70 + k * 68, 196, 56, 34), w: 1.1, fill: true })),
      ...thumbs.map((k): Stroke =>
        soft(`${P([76 + k * 68, 204], [104 + k * 68, 204])} ${P([76 + k * 68, 212], [118 + k * 68, 212])} ${P([76 + k * 68, 218], [110 + k * 68, 218])}`, 0.6),
      ),
      { d: rect(68, 194, 60, 38), w: 1.6, tone: "brand" },
      { d: "M296,128 L296,148 L301,143 L305,152 L309,150 L305,141 L312,141 Z", w: 1.1, fill: true },
    ],
    labels: [
      { x: 88, y: 52, text: "INVESTMENT THESIS", size: 6.5, weight: 800, anchor: "start" },
      { x: 258, y: 72, text: "UPSIDE", size: 5.5, tone: "soft", weight: 700 },
    ],
  };
})();

const team: Scene = {
  key: "team",
  short: "Teamwork",
  title: "Work within your sector.",
  body: "Collaborate with your fellow analysts, following direction from your Sector Head and the Portfolio Manager.",
  strokes: [
    floor,
    { d: rect(140, 26, 120, 76), w: 1.3, fill: true },
    { d: circle(176, 64, 22), w: 1.2 },
    { d: `${P([176, 64], [176, 42])} ${P([176, 64], [196, 75])} ${P([176, 64], [159, 79])}`, w: 1 },
    { d: "M176,64 L176,42 A22,22 0 0,1 196,75 Z", w: 1.4, tone: "brand" },
    { d: rect(212, 78, 8, 14), w: 1 },
    { d: rect(224, 68, 8, 24), w: 1 },
    { d: rect(236, 56, 8, 36), w: 1, tone: "brand" },
    ...bust(110, 198, 0.92, "type"),
    ...bust(290, 198, 0.92, "type"),
    ...bust(200, 192, 1, "gesture"),
    { d: "M70,206 C70,186 330,186 330,206 C330,226 70,226 70,206 Z", w: 1.6, fill: true },
    { d: "M70,206 L70,212 C70,232 330,232 330,212 L330,206", w: 1.2 },
    { d: `${P([120, 230], [120, 262])} ${P([280, 230], [280, 262])}`, w: 1.2 },
    { d: "M92,204 L96,186 L126,186 L130,204 Z", w: 1.1, fill: true },
    { d: "M270,204 L274,186 L304,186 L308,204 Z", w: 1.1, fill: true },
    { d: "M184,212 L202,206 L220,212 L202,218 Z", w: 1, fill: true },
    soft("M190,212 L202,208 M194,214 L208,209"),
    { d: "M240,210 L240,202 L248,202 L248,210", w: 1 },
  ],
};

const pitch: Scene = (() => {
  const audience: Stroke[] = [];
  for (let k = 0; k < 12; k++) audience.push(...audienceMember(28 + k * 31, 238, 0.85));
  for (let k = 0; k < 11; k++) audience.push(...audienceMember(43 + k * 31, 257, 0.95));
  for (let k = 0; k < 12; k++) audience.push(...audienceMember(28 + k * 31, 278, 1.05));
  return {
    key: "pitch",
    short: "Pitch",
    title: "Pitch it to the fund.",
    body: "Present your thesis to the entire SMIF, 30+ people in the room, and defend your numbers.",
    strokes: [
      { d: rect(150, 24, 222, 124), w: 1.6, fill: true },
      soft(`${P([166, 136], [166, 48])} ${P([166, 136], [358, 136])}`, 0.7),
      soft(`${P([166, 114], [358, 114])} ${P([166, 92], [358, 92])} ${P([166, 70], [358, 70])}`, 0.4),
      { d: P([170, 128], [200, 118], [230, 122], [262, 98], [292, 104], [322, 74], [352, 60]), w: 1.8, tone: "brand" },
      { d: rect(316, 34, 38, 16), w: 1.2, tone: "brand" },
      { d: P([16, 214], [384, 214]), w: 1.4 },
      soft(P([16, 220], [384, 220])),
      ...standing(104, 214, 0.92, "present"),
      ...audience,
    ],
    labels: [
      { x: 335, y: 45.5, text: "BUY", size: 8, tone: "brand", weight: 800 },
      { x: 200, y: 42, text: "INVESTMENT THESIS", size: 6, tone: "soft", weight: 700 },
    ],
  };
})();

const manage: Scene = (() => {
  const closes = [130, 124, 127, 118, 121, 112, 106, 110, 99, 93, 96, 86];
  let open = 134;
  const candles: Stroke[] = [];
  const mids: [number, number][] = [];
  closes.forEach((close, i) => {
    const x = 50 + i * 19;
    const top = Math.min(open, close);
    const bottom = Math.max(open, close);
    const up = close < open;
    candles.push({ d: `${P([x, top - 7], [x, top])} ${P([x, bottom], [x, bottom + 7])}`, w: 0.9, tone: up ? "brand" : "ink" });
    candles.push({ d: rect(x - 4.5, top, 9, Math.max(3, bottom - top)), w: 1.1, tone: up ? "brand" : "ink", fill: !up });
    mids.push([x, (top + bottom) / 2]);
    open = close;
  });
  return {
    key: "manage",
    short: "Manage & repeat",
    title: "Manage, then repeat.",
    body: "Once we own it, you track it: earnings, market shifts, and whether the thesis still holds. Then the cycle starts again. Over your time in the SMIF you'll research, report on and pitch several companies.",
    strokes: [
      floor,
      { d: rect(30, 30, 250, 150), w: 1.5, fill: true },
      soft(`${P([38, 60], [272, 60])} ${P([38, 90], [272, 90])} ${P([38, 120], [272, 120])} ${P([38, 150], [272, 150])}`, 0.4),
      ...candles,
      soft(P(...mids), 1),
      { d: rect(214, 200, 62, 46), w: 1.1, fill: true },
      { d: `${P([214, 212], [276, 212])} ${P([228, 196], [228, 204])} ${P([262, 196], [262, 204])}`, w: 1 },
      soft(
        [0, 1, 2, 3, 4]
          .flatMap((c) => [0, 1, 2].map((r) => `M${222 + c * 11},${220 + r * 9} l0.5,0`))
          .join(" "),
        1.6,
      ),
      { d: circle(255, 238, 5.5), w: 1.3, tone: "brand" },
      ...standing(330, 262, 0.95, "hold"),
      { d: rect(312, 176, 36, 24), w: 1.2, fill: true },
      { d: P([316, 194], [324, 188], [331, 191], [343, 181]), w: 1.1, tone: "brand" },
      // stack of past reports: the cycle has run before
      { d: "M44,252 L44,212 L84,212 L84,252", w: 1, o: 0.55, fill: true },
      { d: "M52,256 L52,216 L92,216 L92,256", w: 1, o: 0.75, fill: true },
      { d: rect(60, 220, 40, 40), w: 1.2, fill: true },
      soft(`${P([66, 234], [94, 234])} ${P([66, 240], [90, 240])} ${P([66, 246], [94, 246])}`, 0.6),
      // repeat loop
      { d: "M356,70 A18,18 0 1,1 349.6,56.2", w: 1.6, tone: "brand" },
      { d: "M349.6,56.2 L348,47 M349.6,56.2 L358.4,53.4", w: 1.6, tone: "brand" },
    ],
    labels: [
      { x: 70, y: 46, text: "HOLDING", size: 7, weight: 700 },
      { x: 80, y: 228, text: "REPORT #3", size: 5.5, weight: 700 },
      { x: 338, y: 102, text: "REPEAT", size: 6.5, tone: "brand", weight: 800 },
      { x: 245, y: 209, text: "EARNINGS", size: 5.5, weight: 700 },
    ],
  };
})();

const graduate: Scene = (() => {
  const confetti: [number, number, number][] = [
    [120, 60, 30], [150, 96, -20], [290, 40, 60], [318, 120, -40], [96, 130, 10], [340, 70, 20],
    [270, 130, -60], [130, 30, 45], [212, 36, -15], [356, 150, 35], [84, 92, -35], [300, 170, 15],
  ];
  return {
    key: "graduate",
    short: "Graduate",
    title: "Graduate ready.",
    body: "Leave GCU with real investment experience, and the deliverables to prove it.",
    strokes: [
      floor,
      { d: "M174,262 L178,170 C180,163 190,161 200,161 C210,161 220,163 222,170 L226,262 Z", w: 1.5, fill: true },
      soft(`${P([190, 182], [186, 262])} ${P([210, 182], [214, 262])} ${P([200, 192], [200, 262])}`),
      { d: `${P([192, 162], [188, 240])} ${P([208, 162], [212, 240])}`, w: 1.8, tone: "brand" },
      { d: "M222,170 C230,150 234,132 236,112", w: 1.5 },
      { d: circle(237, 108, 4), w: 1.2 },
      { d: "M178,170 C170,190 168,206 170,222", w: 1.5 },
      { d: P([154, 228], [186, 216]), w: 3.4 },
      { d: "M168,221 L166,230 M172,219 L174,229", w: 1.2, tone: "brand" },
      { d: `${P([196, 154], [196, 161])} ${P([204, 154], [204, 161])}`, w: 1.1 },
      { d: circle(200, 143, 11), w: 1.4, fill: true },
      { d: "M189,143 C188,128 212,128 211,143", w: 1.3 },
      soft("M195,147 C198,150 202,150 205,147", 1),
      { d: "M232,66 L256,56 L280,66 L256,76 Z", w: 1.4, fill: true },
      { d: "M244,70 L244,80 C250,84 262,84 268,80 L268,70", w: 1.3 },
      { d: "M256,66 L272,70 L274,86", w: 1.3, tone: "brand" },
      soft("M234,96 C236,90 238,86 242,82 M246,100 C247,94 249,90 252,86"),
      ...confetti.map(([x, y, a], i): Stroke => {
        const r = (a * Math.PI) / 180;
        return {
          d: P([x, y], [x + Math.cos(r) * 7, y + Math.sin(r) * 7]),
          w: 1.6,
          tone: i % 2 ? "brand" : "soft",
        };
      }),
      soft("M120,170 L120,184 M113,177 L127,177 M292,196 L292,208 M286,202 L298,202", 1),
    ],
  };
})();

export const SCENES: Scene[] = [apply, research, report, model, deck, team, pitch, manage, graduate];
