"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TEAM, type TeamMember } from "@/data/team";
import { slugifyName } from "@/lib/team";
import Avatar from "@/components/team/Avatar";

const AVATAR_SIZE = 140;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

const SECTOR_ORDER = [
  "TMT",
  "Financials",
  "Healthcare",
  "Consumer",
  "Industrials",
  "Energy",
  "Industry Agnostic",
];

function isLeadership(role: string): boolean {
  return role.includes("Portfolio Manager") || role.includes("Sector Head");
}

function isSeniorAnalyst(role: string): boolean {
  return role.includes("Senior Analyst");
}

type Group = { label: string; members: TeamMember[] };

function groupByPosition(members: TeamMember[]): Group[] {
  return [
    { label: "Leadership", members: members.filter((m) => isLeadership(m.role)) },
    { label: "Senior Analysts", members: members.filter((m) => isSeniorAnalyst(m.role)) },
    {
      label: "Analysts",
      members: members.filter((m) => !isLeadership(m.role) && !isSeniorAnalyst(m.role)),
    },
  ].filter((g) => g.members.length > 0);
}

function groupBySector(members: TeamMember[]): Group[] {
  const groups = SECTOR_ORDER.map((sector) => ({
    label: sector,
    members: members.filter((m) => m.sector === sector),
  })).filter((g) => g.members.length > 0);

  const unassigned = members.filter((m) => !m.sector);
  if (unassigned.length > 0) groups.push({ label: "Unassigned", members: unassigned });

  return groups;
}

function TeamGrid({ members }: { members: TeamMember[] }) {
  return (
    <div
      className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3"
      style={{ rowGap: AVATAR_OVERLAP + 32 }}
    >
      {members.map((member) => (
        <Link
          key={member.name}
          href={`/team/${slugifyName(member.name)}`}
          className="relative flex flex-col items-center rounded-lg border border-border bg-surface px-6 pb-5 text-center transition-colors hover:border-brand"
          style={{ paddingTop: AVATAR_OVERLAP + 12 }}
        >
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: -AVATAR_OVERLAP }}>
            <Avatar name={member.name} photoUrl={member.photoUrl} size={AVATAR_SIZE} />
          </div>
          <h3 className="font-semibold text-foreground">{member.name}</h3>
          <p className="text-sm text-brand">{member.role}</p>
          {member.sector && !member.role.includes(member.sector) && (
            <p className="text-xs text-muted">{member.sector}</p>
          )}
          {member.bio && <p className="mt-1 text-sm text-muted">{member.bio}</p>}
        </Link>
      ))}
    </div>
  );
}

export default function TeamPageClient() {
  const [sortMode, setSortMode] = useState<"position" | "sector">("position");

  const groups = useMemo(
    () => (sortMode === "position" ? groupByPosition(TEAM) : groupBySector(TEAM)),
    [sortMode]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Team</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Sort by</p>
        <div className="flex gap-2">
          <button
            onClick={() => setSortMode("position")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              sortMode === "position"
                ? "bg-brand text-white"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            Position
          </button>
          <button
            onClick={() => setSortMode("sector")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              sortMode === "sector"
                ? "bg-brand text-white"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            Sector
          </button>
        </div>
      </div>

      <div className="mt-8">
        {groups.map((group, i) => (
          <section key={group.label} className={i > 0 ? "mt-10" : undefined}>
            <h2
              className="text-lg font-semibold text-foreground"
              style={{ marginBottom: AVATAR_OVERLAP + 24 }}
            >
              {group.label}
            </h2>
            <TeamGrid members={group.members} />
          </section>
        ))}
      </div>
    </div>
  );
}
