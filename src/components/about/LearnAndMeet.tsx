import Reveal from "./Reveal";

const LEARNING = [
  { title: "Read the financials", body: "The three financial statements, public SEC filings, and equity reports." },
  { title: "Build DCF models", body: "Discount future cash flows back to what a business is worth today." },
  { title: "Make deliverables", body: "Readable, high-quality pitch decks and equity reports." },
  { title: "Follow the market", body: "Market shifts and trends, including the SMIF’s own investments." },
  { title: "Work as a team", body: "Collaborate with other analysts under the Portfolio Manager and Sector Heads." },
  { title: "Present with confidence", body: "Speak and pitch in front of 30+ people." },
];

export function Learning() {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEARNING.map((l, i) => (
          <Reveal key={l.title} delay={(i % 3) * 110}>
            <div className="h-full rounded-2xl border-l-4 border-brand bg-surface px-5 py-4 shadow-sm">
              <p className="text-[16px] font-semibold text-foreground">{l.title}</p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-body">{l.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EVENTS: Record<string, { title: string; detail: string }> = {
  Mon: { title: "SMIF course", detail: "1 credit · Charles Schwab Center" },
  Sat: { title: "SMIF meeting", detail: "10am · Charles Schwab Center" },
};
// Weekdays without a meeting: analysts work on their sector. Sunday stays blank.
const SECTOR_DAYS = new Set(["Tue", "Wed", "Thu", "Fri"]);

export function WeekStrip() {
  return (
    <Reveal>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
        {DAYS.map((d) => {
          const ev = EVENTS[d];
          return (
            <div
              key={d}
              className={`flex min-h-[120px] flex-col rounded-2xl border p-2 transition-transform duration-500 sm:min-h-[150px] sm:p-4 ${
                ev
                  ? "border-brand bg-brand text-white shadow-lg shadow-brand/20 hover:-translate-y-1"
                  : "border-border bg-surface text-muted"
              }`}
            >
              <p className={`text-[12px] font-semibold uppercase tracking-wide sm:text-[14px] ${ev ? "text-white/80" : ""}`}>
                {d}
              </p>
              {ev && (
                <div className="mt-auto">
                  <p className="text-[12px] font-bold leading-tight sm:text-[16px]">{ev.title}</p>
                  <p className="mt-1 hidden text-[12px] leading-snug text-white/80 sm:block">{ev.detail}</p>
                </div>
              )}
              {!ev && SECTOR_DAYS.has(d) && (
                <p className="mt-auto text-[11px] font-medium leading-snug text-body sm:text-[14px]">
                  Working within your sector
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}
