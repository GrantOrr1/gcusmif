"use client";

import { useEffect } from "react";

/**
 * The Reports card and the Financial Highlights box sit in a two-column grid
 * where Financial Highlights (a long, fixed list of stats) is almost always
 * the taller column. We want Reports to grow to meet that same bottom edge
 * and scroll internally beyond it, rather than either overshooting past it
 * or leaving a gap — but the exact available height varies per ticker (e.g.
 * whether the SMIF Rating box above Reports is shown), so it's measured at
 * runtime instead of hardcoded.
 */
export default function ReportsHeightSync() {
  useEffect(() => {
    const reports = document.getElementById("reports");
    const financialHighlights = document.getElementById("financial-highlights-box");
    if (!reports || !financialHighlights) return;

    const mediaQuery = window.matchMedia("(min-width: 640px)");

    function sync() {
      if (!reports || !financialHighlights) return;
      if (!mediaQuery.matches) {
        // Below the `sm` breakpoint the columns stack, so Reports should
        // size to its own content instead of matching a box above/below it.
        reports.style.maxHeight = "";
        return;
      }
      const budget = financialHighlights.getBoundingClientRect().bottom - reports.getBoundingClientRect().top;
      reports.style.maxHeight = `${Math.max(budget, 0)}px`;
    }

    sync();
    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(financialHighlights);
    window.addEventListener("resize", sync);
    mediaQuery.addEventListener("change", sync);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", sync);
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  return null;
}
