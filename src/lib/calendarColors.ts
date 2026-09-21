// Purple is reserved for the standing weekly recurring events (SMIF Class /
// SMIF Meeting), and red is reserved for equity earnings-call events, so both
// stay visually distinct from regular one-off events.
export const RECURRING_COLOR = "#7c3aed";
export const EARNINGS_COLOR = "#dc2626";

export const EVENT_COLOR_OPTIONS = [
  { label: "Blue", value: "#2563eb" },
  { label: "Cyan", value: "#0891b2" },
  { label: "Green", value: "#16a34a" },
  { label: "Amber", value: "#d97706" },
  { label: "Pink", value: "#db2777" },
  { label: "Gray", value: "#4b5563" },
];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "";
}

/** "13:00" -> "1:00 PM" */
export function formatTime12(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}
