import type { TeamMember } from "@/data/team";
import { getProfileOverride } from "@/lib/profileOverrides";
import { listTickersAssignedTo } from "@/lib/watchlistStore";

export type EffectiveProfile = {
  bio: string | null;
  linkedinUrl: string | null;
  watchlist: string[];
};

export function getEffectiveProfile(slug: string, person: TeamMember): EffectiveProfile {
  const override = getProfileOverride(slug);

  return {
    bio: override?.bio ?? person.bio ?? null,
    linkedinUrl: override?.linkedinUrl ?? person.linkedinUrl ?? null,
    watchlist: listTickersAssignedTo(person.name),
  };
}
