import { TEAM, type TeamMember } from "@/data/team";

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function teamBySlug(slug: string): TeamMember | undefined {
  return TEAM.find((m) => slugifyName(m.name) === slug);
}

function seniorityRank(role: string): number {
  if (role.includes("Portfolio Manager")) return 0;
  if (role.includes("Sector Head")) return 1;
  if (role.includes("Senior Analyst")) return 2;
  return 3;
}

function bySeniority(members: TeamMember[]): TeamMember[] {
  return [...members].sort((a, b) => seniorityRank(a.role) - seniorityRank(b.role));
}

export function teammatesInSector(sector: string, excludeName: string): TeamMember[] {
  return bySeniority(TEAM.filter((m) => m.sector === sector && m.name !== excludeName));
}

export function sectorHeads(): TeamMember[] {
  return bySeniority(TEAM.filter((m) => m.role.includes("Sector Head")));
}

/** Analysts/sector head covering a given sector label; falls back to the Portfolio Manager. */
export function coverageForSector(sector: string | undefined): TeamMember[] {
  const inSector = bySeniority(TEAM.filter((m) => m.sector === sector));
  if (inSector.length > 0) return inSector;
  const pm = TEAM.find((m) => m.role === "Portfolio Manager");
  return pm ? [pm] : [];
}

export function isSamePerson(sessionName: string | null | undefined, person: TeamMember) {
  if (!sessionName) return false;
  return sessionName.trim().toLowerCase() === person.name.trim().toLowerCase();
}

/**
 * Grant Orr has been granted the same access powers as the Portfolio Manager,
 * in addition to his own Senior Analyst title — a one-off exception, not a
 * role change, so his displayed title/sector stay unchanged everywhere.
 */
export function hasPortfolioManagerAccess(person: TeamMember | null | undefined): boolean {
  if (!person) return false;
  return person.role === "Portfolio Manager" || person.name === "Grant Orr";
}
