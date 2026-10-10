export type CompMetricFormat = "ratio" | "percent" | "currency" | "compactCurrency" | "price" | "number";

export type CompMetric = {
  key: string;
  label: string;
  category: "Valuation" | "Income Statement" | "Balance Sheet" | "Profitability" | "Growth" | "Other";
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

  // Income Statement
  { key: "totalRevenue", label: "Revenue (TTM)", category: "Income Statement", format: "compactCurrency" },
  { key: "costOfRevenue", label: "Cost of Revenue", category: "Income Statement", format: "compactCurrency" },
  { key: "grossProfits", label: "Gross Profit", category: "Income Statement", format: "compactCurrency" },
  {
    key: "sellingGeneralAndAdmin",
    label: "SG&A Expense",
    category: "Income Statement",
    format: "compactCurrency",
  },
  {
    key: "researchAndDevelopment",
    label: "R&D Expense",
    category: "Income Statement",
    format: "compactCurrency",
  },
  { key: "operatingIncome", label: "Operating Income", category: "Income Statement", format: "compactCurrency" },
  { key: "ebitda", label: "EBITDA", category: "Income Statement", format: "compactCurrency" },
  { key: "pretaxIncome", label: "Pretax Income", category: "Income Statement", format: "compactCurrency" },
  { key: "taxProvision", label: "Tax Provision", category: "Income Statement", format: "compactCurrency" },
  { key: "netIncomeToCommon", label: "Net Income", category: "Income Statement", format: "compactCurrency" },
  { key: "trailingEps", label: "EPS (Trailing)", category: "Income Statement", format: "price" },
  { key: "revenuePerShare", label: "Revenue Per Share", category: "Income Statement", format: "price" },

  // Balance Sheet
  { key: "totalAssets", label: "Total Assets", category: "Balance Sheet", format: "compactCurrency" },
  { key: "currentAssets", label: "Current Assets", category: "Balance Sheet", format: "compactCurrency" },
  { key: "inventory", label: "Inventory", category: "Balance Sheet", format: "compactCurrency" },
  { key: "accountsReceivable", label: "Accounts Receivable", category: "Balance Sheet", format: "compactCurrency" },
  { key: "totalCash", label: "Total Cash", category: "Balance Sheet", format: "compactCurrency" },
  { key: "totalCashPerShare", label: "Cash Per Share", category: "Balance Sheet", format: "price" },
  { key: "totalLiabilities", label: "Total Liabilities", category: "Balance Sheet", format: "compactCurrency" },
  { key: "currentLiabilities", label: "Current Liabilities", category: "Balance Sheet", format: "compactCurrency" },
  { key: "accountsPayable", label: "Accounts Payable", category: "Balance Sheet", format: "compactCurrency" },
  { key: "totalDebt", label: "Total Debt", category: "Balance Sheet", format: "compactCurrency" },
  { key: "currentDebt", label: "Current Debt", category: "Balance Sheet", format: "compactCurrency" },
  { key: "longTermDebt", label: "Long-Term Debt", category: "Balance Sheet", format: "compactCurrency" },
  { key: "stockholdersEquity", label: "Stockholders' Equity", category: "Balance Sheet", format: "compactCurrency" },
  { key: "retainedEarnings", label: "Retained Earnings", category: "Balance Sheet", format: "compactCurrency" },
  { key: "bookValue", label: "Book Value Per Share", category: "Balance Sheet", format: "price" },
  { key: "currentRatio", label: "Current Ratio", category: "Balance Sheet", format: "ratio" },
  { key: "quickRatio", label: "Quick Ratio", category: "Balance Sheet", format: "ratio" },
  { key: "debtToEquity", label: "Debt / Equity", category: "Balance Sheet", format: "ratio" },
  { key: "operatingCashflow", label: "Operating Cash Flow", category: "Balance Sheet", format: "compactCurrency" },
  { key: "freeCashflow", label: "Free Cash Flow", category: "Balance Sheet", format: "compactCurrency" },

  // Profitability (ratios)
  { key: "profitMargins", label: "Profit Margin", category: "Profitability", format: "percent" },
  { key: "operatingMargins", label: "Operating Margin", category: "Profitability", format: "percent" },
  { key: "returnOnAssets", label: "Return on Assets", category: "Profitability", format: "percent" },
  { key: "returnOnEquity", label: "Return on Equity", category: "Profitability", format: "percent" },

  // Growth
  { key: "revenueGrowth", label: "Revenue Growth (YoY)", category: "Growth", format: "percent" },
  { key: "earningsGrowth", label: "Earnings Growth (YoY)", category: "Growth", format: "percent" },

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
