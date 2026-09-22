"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { SECTOR_INFO } from "@/lib/sectors";
import { slugifyName, isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { TEAM } from "@/data/team";
import Avatar from "@/components/team/Avatar";

const BASE_TABS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/markets", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/coverage", label: "Coverage" },
  { href: "/reports", label: "Reports" },
  { href: "/team", label: "Team" },
  { href: "/donate", label: "Donate" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [portfolioMenuOpen, setPortfolioMenuOpen] = useState(false);
  const [aboutMenuOpen, setAboutMenuOpen] = useState(false);
  const [coverageMenuOpen, setCoverageMenuOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0);
  const [pendingRatings, setPendingRatings] = useState({ watchlist: 0, coverage: 0 });
  const [ratingsRefreshKey, setRatingsRefreshKey] = useState(0);
  const [seenReportId, setSeenReportId] = useState(0);
  const [latestReportId, setLatestReportId] = useState<number | null>(null);
  const profileHref = session?.user?.name ? `/team/${slugifyName(session.user.name)}` : "/analyst";

  useEffect(() => {
    const bump = () => setPendingRefreshKey((k) => k + 1);
    window.addEventListener("reports-pending-changed", bump);
    return () => window.removeEventListener("reports-pending-changed", bump);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/reports/pending-count")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setPendingReports(json.count ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, pathname, pendingRefreshKey]);

  const showReportsBadge = status === "authenticated" && pendingReports > 0;

  // Published-report notification: visible to everyone, including logged-out
  // visitors, so "seen" state lives in localStorage rather than an account.
  useEffect(() => {
    const readSeen = () => Number(localStorage.getItem("lastSeenReportId") ?? "0");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeenReportId(readSeen());
    const bump = () => setSeenReportId(readSeen());
    window.addEventListener("reports-seen-changed", bump);
    return () => window.removeEventListener("reports-seen-changed", bump);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reports/latest-id")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setLatestReportId(json.latestId ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const showNewReportsBadge = latestReportId !== null && latestReportId > seenReportId;

  function reportsBadgeColor(): "green" | "red" | null {
    if (showNewReportsBadge) return "green";
    if (showReportsBadge) return "red";
    return null;
  }

  const me = status === "authenticated" ? TEAM.find((m) => isSamePerson(session?.user?.name, m)) : undefined;
  const canSeeManagerTabs = !!me && (hasPortfolioManagerAccess(me) || me.role.includes("Sector Head"));

  useEffect(() => {
    const bump = () => setRatingsRefreshKey((k) => k + 1);
    window.addEventListener("ratings-pending-changed", bump);
    return () => window.removeEventListener("ratings-pending-changed", bump);
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !canSeeManagerTabs) return;
    let cancelled = false;
    fetch("/api/ratings/pending-count")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setPendingRatings({ watchlist: json.watchlist ?? 0, coverage: json.coverage ?? 0 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, pathname, canSeeManagerTabs, ratingsRefreshKey]);

  const showCoverageBadge = canSeeManagerTabs && pendingRatings.coverage > 0;
  const showWatchlistBadge = canSeeManagerTabs && pendingRatings.watchlist > 0;

  function badgeColorFor(href: string): "green" | "red" | null {
    if (href === "/reports") return reportsBadgeColor();
    if (href === "/coverage") return showCoverageBadge || showWatchlistBadge ? "red" : null;
    if (href === "/watchlist") return showWatchlistBadge ? "red" : null;
    return null;
  }

  const TABS = [
    ...BASE_TABS.slice(0, 6),
    ...(status === "authenticated" ? [{ href: "/calendar", label: "Calendar" }] : []),
    ...(canSeeManagerTabs ? [{ href: "/attendance", label: "Attendance" }] : []),
    BASE_TABS[6],
    BASE_TABS[7],
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
            S
          </span>
          <span className="hidden sm:inline">SMIF</span>
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted">
            Beta 2.0
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);

            if (tab.href === "/about") {
              const aboutActive = active || isActive(pathname, "/investor-thesis");
              return (
                <div key={tab.href} className="group relative">
                  <Link
                    href={tab.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      aboutActive ? "text-brand" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </Link>
                  <div className="invisible absolute left-0 top-full w-56 pt-1 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                    <div className="rounded-md border border-border bg-surface p-1.5 shadow-lg">
                      <Link
                        href="/about"
                        className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
                      >
                        About
                      </Link>
                      <Link
                        href="/investor-thesis"
                        className="block rounded-md px-3 py-2 text-sm text-muted hover:bg-background hover:text-foreground"
                      >
                        Investor Thesis
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            if (tab.href === "/portfolio") {
              return (
                <div key={tab.href} className="group relative">
                  <Link
                    href={tab.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "text-brand" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </Link>
                  <div className="invisible absolute left-0 top-full w-56 pt-1 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                    <div className="rounded-md border border-border bg-surface p-1.5 shadow-lg">
                      <Link
                        href="/portfolio"
                        className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
                      >
                        Overview
                      </Link>
                      <div className="my-1 border-t border-border" />
                      {SECTOR_INFO.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/portfolio/${s.slug}`}
                          className="block rounded-md px-3 py-2 text-sm text-muted hover:bg-background hover:text-foreground"
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            if (tab.href === "/coverage") {
              const coverageActive = active || isActive(pathname, "/watchlist");
              return (
                <div key={tab.href} className="group relative">
                  <Link
                    href={tab.href}
                    className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      coverageActive ? "text-brand" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    {badgeColorFor(tab.href) && (
                      <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-negative" />
                    )}
                  </Link>
                  <div className="invisible absolute left-0 top-full w-56 pt-1 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                    <div className="rounded-md border border-border bg-surface p-1.5 shadow-lg">
                      <Link
                        href="/coverage"
                        className="relative block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
                      >
                        Coverage
                        {showCoverageBadge && (
                          <span className="absolute right-2 top-2.5 h-2 w-2 rounded-full bg-negative" />
                        )}
                      </Link>
                      <Link
                        href="/watchlist"
                        className="relative block rounded-md px-3 py-2 text-sm text-muted hover:bg-background hover:text-foreground"
                      >
                        Watchlist
                        {showWatchlistBadge && (
                          <span className="absolute right-2 top-2.5 h-2 w-2 rounded-full bg-negative" />
                        )}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "text-brand" : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
                {badgeColorFor(tab.href) && (
                  <span
                    className={`absolute right-0.5 top-0.5 h-2 w-2 rounded-full ${
                      badgeColorFor(tab.href) === "green" ? "bg-positive" : "bg-negative"
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {status === "authenticated" ? (
            <div className="hidden items-center gap-3 sm:flex">
              <Link href={profileHref} aria-label={session.user?.name ?? "Analyst Portal"}>
                <Avatar name={session.user?.name ?? "?"} size={32} />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover sm:inline-block"
            >
              Login
            </Link>
          )}

          <button
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          {TABS.map((tab) => {
            if (tab.href === "/about") {
              const aboutActive = isActive(pathname, "/about") || isActive(pathname, "/investor-thesis");
              return (
                <div key={tab.href}>
                  <button
                    onClick={() => setAboutMenuOpen((v) => !v)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                      aboutActive ? "text-brand" : "text-muted"
                    }`}
                  >
                    {tab.label}
                    <span>{aboutMenuOpen ? "−" : "+"}</span>
                  </button>
                  {aboutMenuOpen && (
                    <div className="ml-3 flex flex-col gap-1 border-l border-border pl-3">
                      <Link
                        href="/about"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-md px-3 py-2 text-sm text-muted"
                      >
                        About
                      </Link>
                      <Link
                        href="/investor-thesis"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-md px-3 py-2 text-sm text-muted"
                      >
                        Investor Thesis
                      </Link>
                    </div>
                  )}
                </div>
              );
            }

            if (tab.href === "/portfolio") {
              return (
                <div key={tab.href}>
                  <button
                    onClick={() => setPortfolioMenuOpen((v) => !v)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                      isActive(pathname, tab.href) ? "text-brand" : "text-muted"
                    }`}
                  >
                    {tab.label}
                    <span>{portfolioMenuOpen ? "−" : "+"}</span>
                  </button>
                  {portfolioMenuOpen && (
                    <div className="ml-3 flex flex-col gap-1 border-l border-border pl-3">
                      <Link
                        href="/portfolio"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-md px-3 py-2 text-sm text-muted"
                      >
                        Overview
                      </Link>
                      {SECTOR_INFO.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/portfolio/${s.slug}`}
                          onClick={() => setMenuOpen(false)}
                          className="rounded-md px-3 py-2 text-sm text-muted"
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if (tab.href === "/coverage") {
              const coverageActive = isActive(pathname, "/coverage") || isActive(pathname, "/watchlist");
              return (
                <div key={tab.href}>
                  <button
                    onClick={() => setCoverageMenuOpen((v) => !v)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                      coverageActive ? "text-brand" : "text-muted"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {tab.label}
                      {badgeColorFor(tab.href) && <span className="h-2 w-2 rounded-full bg-negative" />}
                    </span>
                    <span>{coverageMenuOpen ? "−" : "+"}</span>
                  </button>
                  {coverageMenuOpen && (
                    <div className="ml-3 flex flex-col gap-1 border-l border-border pl-3">
                      <Link
                        href="/coverage"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted"
                      >
                        Coverage
                        {showCoverageBadge && <span className="h-2 w-2 rounded-full bg-negative" />}
                      </Link>
                      <Link
                        href="/watchlist"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted"
                      >
                        Watchlist
                        {showWatchlistBadge && <span className="h-2 w-2 rounded-full bg-negative" />}
                      </Link>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive(pathname, tab.href) ? "text-brand" : "text-muted"
                }`}
              >
                {tab.label}
                {badgeColorFor(tab.href) && (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      badgeColorFor(tab.href) === "green" ? "bg-positive" : "bg-negative"
                    }`}
                  />
                )}
              </Link>
            );
          })}
          {status === "authenticated" ? (
            <>
              <Link
                href={profileHref}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted"
              >
                {session?.user?.name ?? "Analyst Portal"}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white"
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
