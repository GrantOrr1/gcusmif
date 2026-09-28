"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { COMP_METRICS, type CompMetric } from "@/lib/compMetrics";
import { generateCompPeriods, compareCompPeriods, type CompPeriod } from "@/lib/compPeriods";
import { formatCompactCurrency, formatNumber, formatPercent, formatPrice, formatRatio } from "@/lib/format";

const MAX_ROWS = 15;
const MAX_COLS = 15;
const MAX_PERIODS = 8;

const DEFAULT_METRIC_KEYS = [
  "price",
  "marketCap",
  "trailingPE",
  "forwardPE",
  "priceToSalesTrailing12Months",
  "priceToBook",
  "enterpriseToEbitda",
];

type CompanySearchResult = { symbol: string; name: string; exchange: string; type: string };

type PeriodFinancials = Record<string, unknown>;

type CompanyData = Record<string, unknown> & { periods?: PeriodFinancials[] };

type CompanyRow = {
  symbol: string;
  name: string;
  data: CompanyData | null;
  loading: boolean;
  error: boolean;
};

type DisplayColumn = {
  id: string;
  metric: CompMetric;
  period: CompPeriod | null;
};

function formatValue(value: unknown, format: CompMetric["format"]): string {
  if (typeof value !== "number") return "—";
  switch (format) {
    case "percent":
      return formatPercent(value);
    case "currency":
      return formatCompactCurrency(value);
    case "compactCurrency":
      return formatCompactCurrency(value);
    case "price":
      return formatPrice(value);
    case "ratio":
      return formatRatio(value);
    default:
      return formatNumber(value);
  }
}

function valueForColumn(data: CompanyData | null, column: DisplayColumn): unknown {
  if (!data) return null;
  if (!column.period) return data[column.metric.key];
  const entry = data.periods?.find((p) => p.periodKey === column.period!.key);
  return entry ? entry[column.metric.key] : null;
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function CompSheet() {
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [metricKeys, setMetricKeys] = useState<string[]>(DEFAULT_METRIC_KEYS);
  const [periodKeys, setPeriodKeys] = useState<string[]>([]);

  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<CompanySearchResult[]>([]);
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const debouncedCompanyQuery = useDebouncedValue(companyQuery, 250);

  const [metricQuery, setMetricQuery] = useState("");
  const [metricSearchOpen, setMetricSearchOpen] = useState(false);

  const [periodQuery, setPeriodQuery] = useState("");
  const [periodSearchOpen, setPeriodSearchOpen] = useState(false);

  const companySearchRef = useRef<HTMLDivElement>(null);
  const metricSearchRef = useRef<HTMLDivElement>(null);
  const periodSearchRef = useRef<HTMLDivElement>(null);

  const availablePeriods = useMemo(() => generateCompPeriods(), []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (companySearchRef.current && !companySearchRef.current.contains(e.target as Node)) {
        setCompanySearchOpen(false);
      }
      if (metricSearchRef.current && !metricSearchRef.current.contains(e.target as Node)) {
        setMetricSearchOpen(false);
      }
      if (periodSearchRef.current && !periodSearchRef.current.contains(e.target as Node)) {
        setPeriodSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!debouncedCompanyQuery.trim()) return;
    let cancelled = false;
    fetch(`/api/analyst/search?q=${encodeURIComponent(debouncedCompanyQuery)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setCompanyResults(json.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setCompanyResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedCompanyQuery]);

  async function addCompany(symbol: string, name: string) {
    if (rows.length >= MAX_ROWS) return;
    if (rows.some((r) => r.symbol === symbol)) return;
    setCompanyQuery("");
    setCompanyResults([]);
    setCompanySearchOpen(false);

    const row: CompanyRow = { symbol, name, data: null, loading: true, error: false };
    setRows((prev) => [...prev, row]);

    try {
      const res = await fetch(`/api/comp-sheet?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setRows((prev) =>
        prev.map((r) => (r.symbol === symbol ? { ...r, data, loading: false } : r))
      );
    } catch {
      setRows((prev) =>
        prev.map((r) => (r.symbol === symbol ? { ...r, loading: false, error: true } : r))
      );
    }
  }

  function removeCompany(symbol: string) {
    setRows((prev) => prev.filter((r) => r.symbol !== symbol));
  }

  function addMetric(key: string) {
    if (metricKeys.length >= MAX_COLS) return;
    if (metricKeys.includes(key)) return;
    setMetricKeys((prev) => [...prev, key]);
    setMetricQuery("");
    setMetricSearchOpen(false);
  }

  function removeMetric(key: string) {
    setMetricKeys((prev) => prev.filter((k) => k !== key));
  }

  function addPeriod(key: string) {
    if (periodKeys.length >= MAX_PERIODS) return;
    if (periodKeys.includes(key)) return;
    setPeriodKeys((prev) => [...prev, key]);
    setPeriodQuery("");
    setPeriodSearchOpen(false);
  }

  function removePeriod(key: string) {
    setPeriodKeys((prev) => prev.filter((k) => k !== key));
  }

  function clearSheet() {
    setRows([]);
    setPeriodKeys([]);
    setMetricKeys(DEFAULT_METRIC_KEYS);
  }

  const activeMetrics = useMemo(
    () => metricKeys.map((k) => COMP_METRICS.find((m) => m.key === k)).filter((m): m is CompMetric => !!m),
    [metricKeys]
  );

  const activePeriods = useMemo(
    () =>
      periodKeys
        .map((k) => availablePeriods.find((p) => p.key === k))
        .filter((p): p is CompPeriod => !!p)
        .sort(compareCompPeriods),
    [periodKeys, availablePeriods]
  );

  const columns = useMemo<DisplayColumn[]>(() => {
    const cols: DisplayColumn[] = [];
    for (const metric of activeMetrics) {
      if (activePeriods.length > 0) {
        for (const period of activePeriods) {
          cols.push({ id: `${metric.key}:${period.key}`, metric, period });
        }
      } else {
        cols.push({ id: metric.key, metric, period: null });
      }
    }
    return cols;
  }, [activeMetrics, activePeriods]);

  const filteredMetricOptions = useMemo(() => {
    const q = metricQuery.trim().toLowerCase();
    const available = COMP_METRICS.filter((m) => !metricKeys.includes(m.key));
    if (!q) return available;
    return available.filter(
      (m) => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    );
  }, [metricQuery, metricKeys]);

  const filteredPeriodOptions = useMemo(() => {
    const q = periodQuery.trim().toLowerCase();
    const available = availablePeriods.filter((p) => !periodKeys.includes(p.key));
    if (!q) return available;
    return available.filter((p) => p.label.toLowerCase().includes(q));
  }, [periodQuery, periodKeys, availablePeriods]);

  const rowLimitReached = rows.length >= MAX_ROWS;
  const colLimitReached = metricKeys.length >= MAX_COLS;
  const periodLimitReached = periodKeys.length >= MAX_PERIODS;
  const hasAnything = rows.length > 0 || activePeriods.length > 0;

  function numFmtFor(format: CompMetric["format"]): string {
    switch (format) {
      case "percent":
        return "0.00%";
      case "currency":
      case "compactCurrency":
        return "$#,##0";
      case "price":
        return "$#,##0.00";
      case "ratio":
        return '0.00"x"';
      default:
        return "0.00";
    }
  }

  function exportToExcel() {
    const hasPeriods = activePeriods.length > 0;
    const headerRows = hasPeriods ? 2 : 1;

    const headerRow1: string[] = ["Ticker", "Company"];
    const headerRow2: string[] = ["", ""];
    const merges: XLSX.Range[] = hasPeriods
      ? [
          { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
          { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
        ]
      : [];

    let colIndex = 2;
    for (const metric of activeMetrics) {
      const span = hasPeriods ? activePeriods.length : 1;
      headerRow1.push(metric.label, ...Array(span - 1).fill(""));
      if (hasPeriods) {
        headerRow2.push(...activePeriods.map((p) => p.label));
      }
      if (span > 1) {
        merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + span - 1 } });
      }
      colIndex += span;
    }

    const aoa: (string | number | null)[][] = hasPeriods ? [headerRow1, headerRow2] : [headerRow1];
    for (const row of rows) {
      const line: (string | number | null)[] = [row.symbol, row.name];
      for (const col of columns) {
        const value = valueForColumn(row.data, col);
        line.push(typeof value === "number" ? value : null);
      }
      aoa.push(line);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = merges;
    ws["!cols"] = [{ wch: 10 }, { wch: 28 }, ...columns.map(() => ({ wch: 14 }))];

    rows.forEach((_, rIdx) => {
      columns.forEach((col, cIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: headerRows + rIdx, c: cIdx + 2 });
        const cell = ws[cellRef];
        if (cell && typeof cell.v === "number") {
          cell.z = numFmtFor(col.metric.format);
        }
      });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comp Sheet");
    XLSX.writeFile(wb, `comp-sheet-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div ref={companySearchRef} className="relative w-full max-w-[624px]">
            <label className="mb-1 block text-xs font-medium text-muted">
              Add company ({rows.length}/{MAX_ROWS})
            </label>
            <input
              type="text"
              value={companyQuery}
              onChange={(e) => {
                const next = e.target.value;
                setCompanyQuery(next);
                setCompanySearchOpen(true);
                if (!next.trim()) setCompanyResults([]);
              }}
              onFocus={() => setCompanySearchOpen(true)}
              placeholder={rowLimitReached ? "Row limit reached" : "Ticker or company name…"}
              disabled={rowLimitReached}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand disabled:opacity-50"
            />
            {companySearchOpen && companyResults.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
                {companyResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => addCompany(r.symbol, r.name)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-border/40"
                  >
                    <span className="truncate text-foreground">{r.name}</span>
                    <span className="shrink-0 text-xs text-muted">{r.symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={metricSearchRef} className="relative w-full max-w-[399px]">
            <label className="mb-1 block text-xs font-medium text-muted">
              Add metric ({metricKeys.length}/{MAX_COLS})
            </label>
            <input
              type="text"
              value={metricQuery}
              onChange={(e) => {
                setMetricQuery(e.target.value);
                setMetricSearchOpen(true);
              }}
              onFocus={() => setMetricSearchOpen(true)}
              placeholder={colLimitReached ? "Column limit reached" : "Search valuation, ratios…"}
              disabled={colLimitReached}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand disabled:opacity-50"
            />
            {metricSearchOpen && !colLimitReached && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
                {filteredMetricOptions.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted">No matches</p>
                )}
                {filteredMetricOptions.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => addMetric(m.key)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-border/40"
                  >
                    <span className="truncate text-foreground">{m.label}</span>
                    <span className="shrink-0 text-xs text-muted">{m.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={periodSearchRef} className="relative w-full max-w-[209px]">
            <label className="mb-1 block text-xs font-medium text-muted">
              Add period ({periodKeys.length}/{MAX_PERIODS})
            </label>
            <input
              type="text"
              value={periodQuery}
              onChange={(e) => {
                setPeriodQuery(e.target.value);
                setPeriodSearchOpen(true);
              }}
              onFocus={() => setPeriodSearchOpen(true)}
              placeholder={periodLimitReached ? "Period limit reached" : "e.g. Q3 2026, 2025…"}
              disabled={periodLimitReached}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand disabled:opacity-50"
            />
            {periodSearchOpen && !periodLimitReached && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
                {filteredPeriodOptions.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted">No matches</p>
                )}
                {filteredPeriodOptions.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => addPeriod(p.key)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-border/40"
                  >
                    <span className="truncate text-foreground">{p.label}</span>
                    <span className="shrink-0 text-xs text-muted">{p.kind === "quarter" ? "Quarter" : "Year"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={clearSheet}
            disabled={!hasAnything}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted hover:border-red-500 hover:text-red-500 disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
          >
            Clear Comp Sheet
          </button>
          <button
            onClick={exportToExcel}
            disabled={rows.length === 0}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted hover:border-brand hover:text-foreground disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
          >
            Export to Excel
          </button>
        </div>
      </div>

      {activePeriods.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted">Periods:</span>
          {activePeriods.map((p) => (
            <span
              key={p.key}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-foreground"
            >
              {p.label}
              <button onClick={() => removePeriod(p.key)} aria-label={`Remove ${p.label}`} className="text-muted hover:text-red-500">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Search for a ticker or company above to start building your comp sheet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th
                  rowSpan={activePeriods.length > 0 ? 2 : 1}
                  className="sticky left-0 z-10 bg-surface px-3 py-2 text-left align-bottom font-semibold text-foreground"
                >
                  Company
                </th>
                {activeMetrics.map((m) => (
                  <th
                    key={m.key}
                    colSpan={activePeriods.length > 0 ? activePeriods.length : 1}
                    className="border-l border-border px-3 py-2 text-right font-semibold text-foreground"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{m.label}</span>
                      <button
                        onClick={() => removeMetric(m.key)}
                        aria-label={`Remove ${m.label}`}
                        className="text-muted hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
              {activePeriods.length > 0 && (
                <tr className="border-b border-border bg-surface">
                  {activeMetrics.flatMap((m) =>
                    activePeriods.map((p, i) => (
                      <th
                        key={`${m.key}:${p.key}`}
                        className={`px-3 py-1.5 text-right text-xs font-normal text-muted ${i === 0 ? "border-l border-border" : ""}`}
                      >
                        {p.label}
                      </th>
                    ))
                  )}
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.symbol} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 bg-background px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeCompany(row.symbol)}
                        aria-label={`Remove ${row.symbol}`}
                        className="text-muted hover:text-red-500"
                      >
                        ×
                      </button>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{row.symbol}</p>
                        <p className="truncate text-xs text-muted">{row.name}</p>
                      </div>
                    </div>
                  </td>
                  {columns.map((col, i) => (
                    <td
                      key={col.id}
                      className={`px-3 py-2 text-right text-foreground ${
                        i > 0 && (!col.period || col.period === activePeriods[0]) ? "border-l border-border" : ""
                      }`}
                    >
                      {row.loading ? (
                        <span className="text-muted">…</span>
                      ) : row.error ? (
                        <span className="text-muted">—</span>
                      ) : (
                        formatValue(valueForColumn(row.data, col), col.metric.format)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
