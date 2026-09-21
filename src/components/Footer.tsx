import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getSocialLinks } from "@/lib/socialLinks";
import InstagramBadge from "@/components/team/InstagramBadge";
import LinkedInBadge from "@/components/team/LinkedInBadge";
import SocialLinksEditor from "@/components/SocialLinksEditor";

export default async function Footer() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));
  const canEdit = hasPortfolioManagerAccess(me);

  const links = getSocialLinks();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="text-xs text-muted">
          <p>
            The information on this site is provided for educational purposes
            only and does not constitute investment advice or an offer to buy
            or sell any security. Holdings and performance data reflect a
            student-managed investment fund and may be delayed.
          </p>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} Student Managed Investment Fund.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex items-center gap-3">
            <InstagramBadge url={links.instagram} />
            <LinkedInBadge url={links.linkedin ?? undefined} />
          </div>
          {canEdit && (
            <SocialLinksEditor initialInstagram={links.instagram} initialLinkedin={links.linkedin} />
          )}
        </div>
      </div>
    </footer>
  );
}
