"use client";

import { useMemo, useState } from "react";
import type { PerformanceSeries } from "@/lib/performance";
import { hashColor } from "@/lib/colorHash";
import SectorBarChart from "./SectorBarChart";

function quarterIndexOf(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00`).getMonth() / 3);
}

export default function HoldingsPerformancePanel({
  data,
  tickers,
}: {
  /** A Jan-1-to-today performance series — quarters are sliced out of it
   * client-side, so no extra data fetch is needed for this toggle. */
  data: PerformanceSeries;
  tickers: string[];
}) {
  const points = data.points;
  const lastPoint = points.at(-1);
  const currentYear = lastPoint ? new Date(`${lastPoint.date}T00:00:00`).getFullYear() : new Date().getFullYear();
  const currentQuarterIndex = lastPoint ? quarterIndexOf(lastPoint.date) : 0;

  const options = useMemo(() => {
    const quarters = Array.from({ length: currentQuarterIndex + 1 }, (_, i) => ({
      key: `q${i + 1}`,
      label: `Q${i + 1}`,
    }));
    return [...quarters, { key: "ytd", label: "YTD" }];
  }, [currentQuarterIndex]);

  const [selected, setSelected] = useState("ytd");

  const holdingsData = useMemo(() => {
    if (points.length === 0) return [];

    let basePoint = points[0];
    let endPoint = points[points.length - 1];

    if (selected !== "ytd") {
      const qIndex = Number(selected.slice(1)) - 1;
      const startDate = new Date(currentYear, qIndex * 3, 1);
      const endDate = new Date(currentYear, qIndex * 3 + 3, 0);
      const startKey = startDate.toISOString().slice(0, 10);
      const endKey = endDate.toISOString().slice(0, 10);

      // Base = last close before this quarter began (Jan 1 itself for Q1).
      const before = points.filter((p) => p.date < startKey);
      basePoint = before.length > 0 ? before[before.length - 1] : points[0];

      // End = last close on or before the quarter's end (or today, if the quarter is still in progress).
      const withinOrBefore = points.filter((p) => p.date <= endKey);
      endPoint = withinOrBefore.length > 0 ? withinOrBefore[withinOrBefore.length - 1] : points[points.length - 1];
    }

    return tickers
      .filter((t) => basePoint.holdingPrices[t] !== undefined && endPoint.holdingPrices[t] !== undefined)
      .map((ticker) => {
        const baseVal = basePoint.holdingPrices[ticker];
        const endVal = endPoint.holdingPrices[ticker];
        return { sector: ticker, value: baseVal ? endVal / baseVal - 1 : 0 };
      });
  }, [selected, points, currentYear, tickers]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => setSelected(o.key)}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              selected === o.key
                ? "bg-brand text-white"
                : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex flex-1 items-center">
        {holdingsData.length > 0 ? (
          <SectorBarChart
            data={holdingsData}
            colorFor={hashColor}
            hrefFor={(ticker) => `/equity/${ticker}`}
          />
        ) : (
          <p className="w-full py-10 text-center text-xs text-muted">No data available.</p>
        )}
      </div>
    </div>
  );
}
