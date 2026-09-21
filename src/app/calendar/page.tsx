import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { listCalendarEvents } from "@/lib/calendarStore";
import { listRecurringEvents } from "@/lib/recurringEvents";
import { withCoverage, listEarningsEligibleTickers } from "@/lib/tickerCoverage";
import CalendarView from "@/components/calendar/CalendarView";

export const metadata = {
  title: "Calendar | Student Managed Investment Fund",
};

export default async function CalendarPage() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));
  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const canAdd = isPortfolioManager || !!me?.role.includes("Sector Head");

  const [events, recurringEvents, equityOptions] = await Promise.all([
    Promise.resolve(listCalendarEvents().map(withCoverage)),
    Promise.resolve(listRecurringEvents()),
    listEarningsEligibleTickers(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
      <p className="mt-1 text-sm text-muted">
        Fund events and important dates.
        {canAdd
          ? " Click + on a day to add an event."
          : " Sector Heads and the Portfolio Manager can add events."}
      </p>

      <div className="mt-6">
        <CalendarView
          initialEvents={events}
          initialRecurring={recurringEvents}
          equityOptions={equityOptions}
          canAdd={canAdd}
          myName={me?.name ?? null}
          isPortfolioManager={isPortfolioManager}
        />
      </div>
    </div>
  );
}
