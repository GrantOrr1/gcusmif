export type CompMetricFormat = "ratio" | "percent" | "currency" | "compactCurrency" | "price" | "number";

export type CompMetric = {
  key: string;
  label: string;
  category: "Valuation" | "Profitability" | "Growth" | "Liquidity & Leverage" | "Other";
  format: CompMetricFormat;
};

/** Every column selectable on the X axis of the Comp Sheet. `key` matches a
 * field on the flat object returned by /api/comp-sheet/metrics. */
export const COMP_METRICS: CompMetric[] = [
  // Valuation
  { key: "price", label: "Price", category: "Valuation", format: "price" },
  { key: "marketCap", label: "Market Cap", category: "Valuation", format: "compactCurrency" },
  { key: "enterpriseValue", label: "Enterprise Value", category: "Valuation", format: "compactCurrency" },
  { key: "trailingPE", label: "P/E (Trailing)", category: "Valuation", format: "ratio" },
  { key: "forwardPE", label: "P/E (Forward)", category: "Valuation", format: "ratio" },
  { key: "pegRatio", label: "PEG Ratio", category: "Valuation", format: "ratio" },
  { key: "priceToSalesTrailing12Months", label: "P/S (TTM)", category: "Valuation", format: "ratio" },
  { key: "priceToBook", label: "P/B", category: "Valuation", format: "ratio" },
  { key: "enterpriseToRevenue", label: "EV/Revenue", category: "Valuation", format: "ratio" },
  { key: "enterpriseToEbitda", label: "EV/EBITDA", category: "Valuation", format: "ratio" },

  // Profitability
  { key: "profitMargins", label: "Profit Margin", category: "Profitability", format: "percent" },
  { key: "operatingMargins", label: "Operating Margin", category: "Profitability", format: "percent" },
  { key: "returnOnAssets", label: "Return on Assets", category: "Profitability", format: "percent" },
  { key: "returnOnEquity", label: "Return on Equity", category: "Profitability", format: "percent" },
  { key: "grossProfits", label: "Gross Profit", category: "Profitability", format: "compactCurrency" },
  { key: "ebitda", label: "EBITDA", category: "Profitability", format: "compactCurrency" },
  { key: "netIncomeToCommon", label: "Net Income", category: "Profitability", format: "compactCurrency" },
  { key: "trailingEps", label: "EPS (Trailing)", category: "Profitability", format: "price" },

  // Growth
  { key: "revenueGrowth", label: "Revenue Growth (YoY)", category: "Growth", format: "percent" },
  { key: "earningsGrowth", label: "Earnings Growth (YoY)", category: "Growth", format: "percent" },
  { key: "totalRevenue", label: "Revenue (TTM)", category: "Growth", format: "compactCurrency" },
  { key: "revenuePerShare", label: "Revenue Per Share", category: "Growth", format: "price" },

  // Liquidity & Leverage (asset-management-style ratios)
  { key: "currentRatio", label: "Current Ratio", category: "Liquidity & Leverage", format: "ratio" },
  { key: "quickRatio", label: "Quick Ratio", category: "Liquidity & Leverage", format: "ratio" },
  { key: "debtToEquity", label: "Debt / Equity", category: "Liquidity & Leverage", format: "ratio" },
  { key: "totalCash", label: "Total Cash", category: "Liquidity & Leverage", format: "compactCurrency" },
  { key: "totalCashPerShare", label: "Cash Per Share", category: "Liquidity & Leverage", format: "price" },
  { key: "totalDebt", label: "Total Debt", category: "Liquidity & Leverage", format: "compactCurrency" },
  { key: "bookValue", label: "Book Value Per Share", category: "Liquidity & Leverage", format: "price" },
  { key: "operatingCashflow", label: "Operating Cash Flow", category: "Liquidity & Leverage", format: "compactCurrency" },
  { key: "freeCashflow", label: "Free Cash Flow", category: "Liquidity & Leverage", format: "compactCurrency" },

  // Other
  { key: "beta", label: "Beta", category: "Other", format: "number" },
  { key: "dividendYield", label: "Dividend Yield", category: "Other", format: "percent" },
  { key: "dividendRate", label: "Dividend Rate", category: "Other", format: "price" },
  { key: "fiftyTwoWeekLow", label: "52 Week Low", category: "Other", format: "price" },
  { key: "fiftyTwoWeekHigh", label: "52 Week High", category: "Other", format: "price" },
];

export function findCompMetric(key: string): CompMetric | undefined {
  return COMP_METRICS.find((m) => m.key === key);
}
