import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { teamBySlug, slugifyName, teammatesInSector, sectorHeads, isSamePerson } from "@/lib/team";
import { getEffectiveProfile } from "@/lib/teamProfile";
import { getPortfolioData } from "@/lib/portfolio";
import { listCoverageForPerson } from "@/lib/coverageStore";
import { listApprovedReportsByUploader } from "@/lib/reportUploads";
import { sectorByLabel } from "@/lib/sectors";
import { formatPercent } from "@/lib/format";
import Avatar from "@/components/team/Avatar";
import AssigneeList from "@/components/team/AssigneeList";
import LinkedInBadge from "@/components/team/LinkedInBadge";
import EmailBadge from "@/components/team/EmailBadge";
import ProfileEditor from "@/components/team/ProfileEditor";

const TYPE_LABELS: Record<string, string> = {
  equity_report: "Equity Report",
  coverage_watchlist_report: "Watchlist Report",
  financial_model: "Financial Model",
};

export default async function PersonPage({ params }: PageProps<"/team/[slug]">) {
  const { slug } = await params;
  const person = teamBySlug(slug);
  if (!person) notFound();

  const [session, portfolio] = await Promise.all([auth(), getPortfolioData()]);
  const profile = getEffectiveProfile(slug, person);
  const own = isSamePerson(session?.user?.name, person);

  const isPortfolioManager = person.role === "Portfolio Manager";
  const related = isPortfolioManager
    ? sectorHeads()
    : person.sector
      ? teammatesInSector(person.sector, person.name)
      : [];
  const relatedLabel = isPortfolioManager
    ? "Sector Heads"
    : person.sector
      ? `${person.sector} Team`
      : null;

  const sectorInfo = person.sector ? sectorByLabel(person.sector) : undefined;
  const coverageTickers = new Set(listCoverageForPerson(person.name).map((c) => c.ticker));
  const coverageHoldings = portfolio.holdings.filter((h) => coverageTickers.has(h.ticker));
  const myReports = listApprovedReportsByUploader(person.name);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/team" className="text-sm text-muted hover:text-foreground">
        ← Back to Team
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-6">
          <Avatar name={person.name} photoUrl={person.photoUrl} size={252} />
          <div className="mt-4 sm:mt-0">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-bold text-foreground">{person.name}</h1>
              <LinkedInBadge url={profile.linkedinUrl ?? undefined} />
              <EmailBadge email={profile.email ?? undefined} />
            </div>
            <p className="text-brand">{person.role}</p>
            {person.sector && !person.role.includes(person.sector) && (
              <p className="text-sm text-muted">{person.sector}</p>
            )}
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              {profile.bio ?? "Bio coming soon."}
            </p>

            {own && (
              <ProfileEditor
                slug={slug}
                name={person.name}
                initialBio={profile.bio}
                initialLinkedinUrl={profile.linkedinUrl}
                initialEmail={profile.email}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Coverage</h2>
              {sectorInfo && (
                <Link
                  href={`/portfolio/${sectorInfo.slug}`}
                  className="text-xs text-muted hover:text-foreground"
                >
                  View all
                </Link>
              )}
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              {coverageHoldings.length === 0 ? (
                <p className="text-xs text-muted">No coverage equities assigned yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {coverageHoldings.map((h) => (
                    <li key={h.ticker}>
                      <Link
                        href={`/equity/${h.ticker}`}
                        className="flex items-center justify-between text-xs hover:text-brand"
                      >
                        <span className="font-medium text-foreground">{h.ticker}</span>
                        <span
                          className={
                            (h.percentChange ?? 0) >= 0 ? "text-positive" : "text-negative"
                          }
                        >
                          {formatPercent(h.percentChange)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Equity Watchlist</h2>
            <div className="rounded-lg border border-border bg-surface p-3">
              {profile.watchlist.length > 0 ? (
                <ul className="space-y-1.5">
                  {profile.watchlist.map((ticker) => (
                    <li key={ticker}>
                      <Link
                        href={`/equity/${ticker}`}
                        className="text-xs font-medium text-foreground hover:text-brand"
                      >
                        {ticker}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">No watchlist equities yet.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Reports</h2>
            <div className="rounded-lg border border-border bg-surface p-3">
              {myReports.length > 0 ? (
                <ul className="space-y-2">
                  {myReports.map((report) => (
                    <li key={report.id} className="flex items-center justify-between gap-3">
                      <a
                        href={`/api/reports/file/${report.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 hover:text-brand"
                      >
                        <p className="truncate text-xs font-medium text-foreground">{report.title}</p>
                        <p className="text-xs text-muted">
                          {report.ticker ? `${report.ticker} · ` : ""}
                          {TYPE_LABELS[report.reportType] ?? report.reportType}
                        </p>
                      </a>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <AssigneeList
                          names={[
                            person.name,
                            ...[report.uploadedBy, ...report.coAuthors].filter((n) => n !== person.name),
                          ]}
                          avatarSize={16}
                          maxShown={1}
                        />
                        <p className="whitespace-nowrap text-xs text-muted">
                          Published{" "}
                          {new Date(report.reviewedAt ?? report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">No reports uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && relatedLabel && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-foreground">{relatedLabel}</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {related.map((m) => (
              <Link
                key={m.name}
                href={`/team/${slugifyName(m.name)}`}
                className="flex w-28 shrink-0 flex-col items-center rounded-lg border border-border bg-surface p-4 text-center hover:border-brand"
              >
                <Avatar name={m.name} photoUrl={m.photoUrl} size={64} />
                <p className="mt-2 text-sm font-semibold text-foreground">{m.name}</p>
                <p className="text-xs text-muted">{m.role}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
