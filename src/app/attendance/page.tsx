import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, sectorHeads, hasPortfolioManagerAccess } from "@/lib/team";
import AttendanceBoard from "@/components/attendance/AttendanceBoard";

export const metadata = {
  title: "Attendance | Student Managed Investment Fund",
};

export default async function AttendancePage() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = !!me?.role.includes("Sector Head");

  if (!me || !(isPortfolioManager || isSectorHead)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
        <p className="mt-4 text-sm text-muted">
          This page is only available to Sector Heads and the Portfolio Manager.
        </p>
      </div>
    );
  }

  const sectors = isPortfolioManager
    ? sectorHeads()
        .map((h) => h.sector)
        .filter((s): s is string => !!s)
    : [me.sector!];

  const sectorRosters = sectors.map((sector) => ({
    sector,
    roster: TEAM.filter((m) => m.sector === sector).map((m) => ({ name: m.name, role: m.role })),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
      <p className="mt-2 text-sm text-muted">
        {isPortfolioManager
          ? "Read-only view of attendance marked by each Sector Head, for our Monday and Saturday meetings."
          : "Mark attendance for your sector's Monday and Saturday meetings."}
      </p>

      <AttendanceBoard
        canEdit={isSectorHead}
        sectorRosters={sectorRosters}
        defaultSector={sectors[0] ?? ""}
      />
    </div>
  );
}
