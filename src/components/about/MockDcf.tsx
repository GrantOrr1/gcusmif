"use client";

import { useMemo, useState } from "react";

// A walkthrough DCF for a fictional company. All figures in $ millions except per-share.
const COMPANY = "Canyon Coffee Co.";
const BASE_REVENUE = 500;
const SHARES = 20; // millions
const NET_DEBT = 200;
const PRICE = 35;
const YEARS = [1, 2, 3, 4, 5];
const COLS = ["C", "D", "E", "F", "G"];

type Inputs = {
  growth: number;
  margin: number;
  tax: number;
  da: number;
  capex: number;
  nwc: number;
  rate: number;
  tg: number;
};

const DEFAULTS: Inputs = { growth: 8, margin: 18, tax: 21, da: 4, capex: 6, nwc: 10, rate: 10, tg: 3 };

type InputKey = keyof Inputs;
const INPUT_META: Record<InputKey, { label: string; min: number; max: number; step: number }> = {
  growth: { label: "Revenue growth", min: 0, max: 20, step: 1 },
  margin: { label: "EBIT margin", min: 5, max: 35, step: 1 },
  tax: { label: "Tax rate", min: 10, max: 30, step: 1 },
  da: { label: "D&A (% of revenue)", min: 1, max: 10, step: 0.5 },
  capex: { label: "CapEx (% of revenue)", min: 1, max: 12, step: 0.5 },
  nwc: { label: "Working capital (% of revenue growth)", min: 0, max: 30, step: 1 },
  rate: { label: "Discount rate", min: 6, max: 15, step: 0.5 },
  tg: { label: "Terminal growth", min: 1, max: 4, step: 0.5 },
};

type RowId =
  | "revenue" | "ebit" | "tax" | "nopat" | "da" | "capex" | "nwc" | "fcf" | "df" | "pv";

const ROWS: { id: RowId; label: string; formula: string; sign?: "+" | "−"; bold?: boolean; pct?: boolean }[] = [
  { id: "revenue", label: "Revenue", formula: "= prior year × (1 + Revenue growth)" },
  { id: "ebit", label: "EBIT (operating profit)", formula: "= Revenue × EBIT margin" },
  { id: "tax", label: "Taxes", formula: "= EBIT × Tax rate", sign: "−" },
  { id: "nopat", label: "NOPAT", formula: "= EBIT × (1 − Tax rate)", bold: true },
  { id: "da", label: "Depreciation & amortization", formula: "= Revenue × D&A %", sign: "+" },
  { id: "capex", label: "Capital expenditures", formula: "= Revenue × CapEx %", sign: "−" },
  { id: "nwc", label: "Change in working capital", formula: "= (Revenue − prior Revenue) × NWC %", sign: "−" },
  { id: "fcf", label: "Free cash flow", formula: "= NOPAT + D&A − CapEx − ΔNWC", bold: true },
  { id: "df", label: "Discount factor", formula: "= 1 ÷ (1 + Discount rate) ^ Year" },
  { id: "pv", label: "PV of free cash flow", formula: "= Free cash flow × Discount factor", bold: true },
];

const STEPS: { title: string; body: string; rows: RowId[]; inputs: InputKey[] }[] = [
  {
    title: "Forecast revenue",
    body: "Every DCF starts with the top line. How fast can this business grow its sales over the next five years? This is where your research on the industry and the company's moat shows up.",
    rows: ["revenue"],
    inputs: ["growth"],
  },
  {
    title: "Find operating profit",
    body: "EBIT is what's left after running the business, before interest and taxes. The margin tells you how much of each sales dollar the company keeps.",
    rows: ["ebit"],
    inputs: ["margin"],
  },
  {
    title: "Pay the taxman",
    body: "Take taxes out of EBIT to get NOPAT, net operating profit after taxes. It's the profit the business earns before any financing decisions.",
    rows: ["tax", "nopat"],
    inputs: ["tax"],
  },
  {
    title: "Adjust from profit to cash",
    body: "Profit isn't cash. Add back depreciation (a non-cash expense), then subtract the money the business must reinvest: new equipment (CapEx) and extra working capital to support growth.",
    rows: ["da", "capex", "nwc"],
    inputs: ["da", "capex", "nwc"],
  },
  {
    title: "Arrive at free cash flow",
    body: "Free cash flow is the cash actually available to investors after the business sustains its operations. This is the owner-earnings number Buffett cares about.",
    rows: ["fcf"],
    inputs: [],
  },
  {
    title: "Discount it to today",
    body: "Each future year's cash is worth less today. Multiply by the discount factor, 1 ÷ (1 + r)^t, using the discount rate you built above.",
    rows: ["df", "pv"],
    inputs: ["rate"],
  },
  {
    title: "Add the terminal value",
    body: "The business doesn't stop after year 5. The terminal value uses the constant-growth (Gordon) model to value every year after the forecast, then discounts it back too.",
    rows: [],
    inputs: ["tg"],
  },
  {
    title: "Get to a price per share",
    body: "Add it all up for enterprise value, subtract net debt to get the value that belongs to shareholders, and divide by shares outstanding. Then compare it to the market price.",
    rows: [],
    inputs: [],
  },
];

const fmt = (v: number, d = 1) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function MockDcf() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<{ row: RowId; col: number } | null>(null);

  const model = useMemo(() => {
    const g = inputs.growth / 100;
    const r = inputs.rate / 100;
    const tg = inputs.tg / 100;
    const cells: Record<RowId, number[]> = {
      revenue: [], ebit: [], tax: [], nopat: [], da: [], capex: [], nwc: [], fcf: [], df: [], pv: [],
    };
    let prev = BASE_REVENUE;
    YEARS.forEach((t) => {
      const rev = prev * (1 + g);
      const ebit = rev * (inputs.margin / 100);
      const tax = ebit * (inputs.tax / 100);
      const nopat = ebit - tax;
      const da = rev * (inputs.da / 100);
      const capex = rev * (inputs.capex / 100);
      const nwc = (rev - prev) * (inputs.nwc / 100);
      const fcf = nopat + da - capex - nwc;
      const df = 1 / Math.pow(1 + r, t);
      cells.revenue.push(rev);
      cells.ebit.push(ebit);
      cells.tax.push(tax);
      cells.nopat.push(nopat);
      cells.da.push(da);
      cells.capex.push(capex);
      cells.nwc.push(nwc);
      cells.fcf.push(fcf);
      cells.df.push(df);
      cells.pv.push(fcf * df);
      prev = rev;
    });
    const sumPv = cells.pv.reduce((a, b) => a + b, 0);
    const tv = (cells.fcf[4] * (1 + tg)) / (r - tg);
    const pvTv = tv * cells.df[4];
    const ev = sumPv + pvTv;
    const equity = ev - NET_DEBT;
    const perShare = equity / SHARES;
    return { cells, sumPv, tv, pvTv, ev, equity, perShare, mos: (perShare - PRICE) / perShare };
  }, [inputs]);

  // rows revealed so far, and the rows/inputs the current step is about
  const revealed = new Set(STEPS.slice(0, step + 1).flatMap((s) => s.rows));
  const focusRows = new Set(STEPS[step].rows);
  const focusInputs = new Set(STEPS[step].inputs);
  const showTv = step >= 6;
  const showEquity = step >= 7;

  const sel = selected && revealed.has(selected.row) ? selected : null;
  const selRow = sel ? ROWS.find((r) => r.id === sel.row)! : null;
  const selRowNum = sel ? ROWS.findIndex((r) => r.id === sel.row) + 3 : 0;

  const verdict =
    model.mos >= 0.15
      ? { label: "Buy zone", cls: "text-positive" }
      : model.mos >= 0
        ? { label: "Watchlist", cls: "text-foreground" }
        : { label: "Overvalued", cls: "text-negative" };

  return (
    <div className="rounded-3xl border border-border bg-surface shadow-sm">
      {/* stepper */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4 sm:px-8">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            onClick={() => setStep(i)}
            aria-label={`Step ${i + 1}: ${s.title}`}
            className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[13px] font-semibold transition-all duration-300 ${
              i === step
                ? "bg-brand text-white shadow-md shadow-brand/30"
                : i < step
                  ? "bg-brand/15 text-brand"
                  : "bg-background text-muted hover:text-foreground"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <span className="ml-auto text-[13px] text-muted">{COMPANY} · fictional company · $ millions</span>
      </div>

      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_1.9fr]">
        {/* explanation + assumptions */}
        <div>
          <div key={step} className="animate-fade-in-down" style={{ animationDuration: "0.5s" }}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-brand">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="mt-2 text-[24px] font-bold leading-tight text-foreground">{STEPS[step].title}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-body">{STEPS[step].body}</p>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-full border border-border px-4 py-2 text-[14px] font-semibold text-foreground transition-colors hover:bg-background disabled:opacity-40"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={step === STEPS.length - 1}
              className="rounded-full bg-brand px-5 py-2 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-hover disabled:opacity-40"
            >
              Next step →
            </button>
          </div>

          <div className="mt-8 rounded-2xl bg-background p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Assumptions</p>
            <div className="mt-3 space-y-3">
              {(Object.keys(INPUT_META) as InputKey[]).map((k) => {
                const m = INPUT_META[k];
                const hot = focusInputs.has(k);
                return (
                  <label
                    key={k}
                    className={`block rounded-lg px-2 py-1.5 transition-all duration-500 ${
                      hot ? "bg-brand/10 ring-1 ring-brand/40" : focusInputs.size ? "opacity-55" : ""
                    }`}
                  >
                    <span className="flex justify-between text-[13px] text-body">
                      <span>{m.label}</span>
                      <span className="font-semibold tabular-nums text-foreground">{inputs[k]}%</span>
                    </span>
                    <input
                      type="range"
                      min={m.min}
                      max={m.max}
                      step={m.step}
                      value={inputs[k]}
                      onChange={(e) => setInputs((p) => ({ ...p, [k]: Number(e.target.value) }))}
                      className="range-brand mt-1 w-full"
                    />
                  </label>
                );
              })}
            </div>
            <button
              onClick={() => setInputs(DEFAULTS)}
              className="mt-3 text-[13px] font-medium text-brand hover:underline"
            >
              Reset assumptions
            </button>
          </div>
        </div>

        {/* spreadsheet */}
        <div className="min-w-0">
          {/* formula bar */}
          <div className="flex items-center gap-3 rounded-t-xl border border-border bg-background px-3 py-2 font-mono text-[13px]">
            <span className="w-10 shrink-0 font-semibold text-muted">
              {sel ? `${COLS[sel.col]}${selRowNum}` : ""}
            </span>
            <span className="italic text-muted">fx</span>
            <span className="truncate text-foreground">
              {selRow ? selRow.formula : "Click any number to see its formula"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-b-xl border border-t-0 border-border">
            <table className="w-full min-w-[620px] border-collapse font-mono text-[13px]">
              <thead>
                <tr className="bg-background text-[11px] text-muted">
                  <th className="w-8 border-r border-border py-1 font-normal" />
                  <th className="border-r border-border py-1 font-normal">A</th>
                  <th className="border-r border-border py-1 font-normal">B</th>
                  {COLS.map((c) => (
                    <th key={c} className="border-r border-border py-1 font-normal last:border-r-0">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="border-r border-border bg-background text-center text-[11px] text-muted">1</td>
                  <td className="px-3 py-2 font-sans text-[13px] font-semibold text-foreground">{COMPANY}</td>
                  <td className="border-l border-border px-3 py-2 text-right text-muted">Today</td>
                  {YEARS.map((t) => (
                    <td key={t} className="border-l border-border px-3 py-2 text-right font-semibold text-foreground">
                      Year {t}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="border-r border-border bg-background text-center text-[11px] text-muted">2</td>
                  <td className="px-3 py-1.5 font-sans text-muted">Base revenue</td>
                  <td className="border-l border-border px-3 py-1.5 text-right text-body">{fmt(BASE_REVENUE)}</td>
                  {YEARS.map((t) => (
                    <td key={t} className="border-l border-border" />
                  ))}
                </tr>
                {ROWS.map((row, ri) => {
                  const shown = revealed.has(row.id);
                  const focus = focusRows.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-border transition-all duration-500 ${
                        focus ? "bg-brand/10" : row.bold && shown ? "bg-background/60" : ""
                      }`}
                    >
                      <td className="border-r border-border bg-background text-center text-[11px] text-muted">{ri + 3}</td>
                      <td
                        className={`whitespace-nowrap px-3 py-1.5 font-sans transition-opacity duration-500 ${
                          shown ? "opacity-100" : "opacity-25"
                        } ${row.bold ? "font-semibold text-foreground" : "text-body"}`}
                      >
                        {row.sign && <span className="mr-1 text-muted">{row.sign}</span>}
                        {row.label}
                      </td>
                      <td className="border-l border-border" />
                      {YEARS.map((t, ci) => {
                        const v = model.cells[row.id][ci];
                        const isSel = sel?.row === row.id && sel.col === ci;
                        return (
                          <td
                            key={t}
                            onClick={() => shown && setSelected({ row: row.id, col: ci })}
                            className={`border-l border-border px-3 py-1.5 text-right tabular-nums transition-all duration-500 ${
                              shown ? "cursor-pointer opacity-100 hover:bg-brand/10" : "opacity-0"
                            } ${isSel ? "outline outline-2 -outline-offset-2 outline-brand" : ""} ${
                              row.bold ? "font-semibold text-foreground" : "text-body"
                            } ${row.id === "fcf" && v < 0 ? "text-negative" : ""}`}
                            style={{ transitionDelay: shown ? `${ci * 70}ms` : "0ms" }}
                          >
                            {row.id === "df" ? v.toFixed(3) : fmt(v)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* valuation summary */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Valuation</p>
              <dl className="mt-3 space-y-1.5 font-mono text-[13px]">
                {[
                  { k: "Sum of PV (years 1–5)", v: model.sumPv, show: step >= 5 },
                  { k: "Terminal value (year 5)", v: model.tv, show: showTv },
                  { k: "PV of terminal value", v: model.pvTv, show: showTv },
                  { k: "Enterprise value", v: model.ev, show: showEquity, bold: true },
                  { k: "− Net debt", v: NET_DEBT, show: showEquity },
                  { k: "Equity value", v: model.equity, show: showEquity, bold: true },
                ].map((l) => (
                  <div
                    key={l.k}
                    className={`flex justify-between transition-all duration-500 ${l.show ? "opacity-100" : "opacity-20"}`}
                  >
                    <dt className={`font-sans ${l.bold ? "font-semibold text-foreground" : "text-body"}`}>{l.k}</dt>
                    <dd className={`tabular-nums ${l.bold ? "font-semibold text-foreground" : "text-body"}`}>
                      {l.show ? fmt(l.v) : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div
              className={`flex flex-col rounded-2xl border p-4 transition-all duration-700 ${
                showEquity ? "border-brand/50 bg-brand/[0.07]" : "border-border bg-background opacity-40"
              }`}
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Intrinsic value per share</p>
              <p className="mt-1 text-[40px] font-bold leading-none tabular-nums text-foreground">
                {showEquity ? `$${model.perShare.toFixed(2)}` : "$ ?"}
              </p>
              <p className="mt-2 text-[12px] text-muted">Equity value ÷ {SHARES}M shares</p>

              {/* side-by-side comparison so the market price reads clearly */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Market price</p>
                  <p className="mt-1 text-[22px] font-bold leading-none tabular-nums text-foreground">
                    ${PRICE.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Margin of safety</p>
                  <p
                    className={`mt-1 text-[22px] font-bold leading-none tabular-nums ${
                      showEquity ? verdict.cls : "text-muted"
                    }`}
                  >
                    {showEquity
                      ? `${model.mos >= 0 ? "" : "−"}${Math.abs(Math.round(model.mos * 100))}%`
                      : "—"}
                  </p>
                </div>
              </div>

              {showEquity && (
                <p
                  className={`animate-fade-in-down mt-4 w-fit rounded-full px-3 py-1 text-[13px] font-semibold ${
                    verdict.label === "Buy zone"
                      ? "bg-positive/15 text-positive"
                      : verdict.label === "Overvalued"
                        ? "bg-negative/15 text-negative"
                        : "bg-background text-foreground"
                  }`}
                  style={{ animationDuration: "0.5s" }}
                >
                  {verdict.label}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
