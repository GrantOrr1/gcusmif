// Client-safe report helpers (reportUploads.ts touches the filesystem, so it
// can't be imported from client components).

export const REPORT_TYPE_LABELS: Record<string, string> = {
  equity_report: "Equity Report",
  coverage_watchlist_report: "Coverage Report",
  financial_model: "Financial Model",
  pitch_deck: "Pitch Deck",
};

/** Only PDFs render in the browser; Word, PowerPoint and Excel files are downloaded. */
export function opensInBrowser(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}
