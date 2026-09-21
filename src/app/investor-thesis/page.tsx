import Image from "next/image";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getPageContent } from "@/lib/sitePages";
import PageContent from "@/components/pages/PageContent";
import PageContentEditor from "@/components/pages/PageContentEditor";

export const metadata = {
  title: "Investor Thesis | Student Managed Investment Fund",
};

const DEFAULT_CONTENT = `Placeholder content — replace this with your fund's actual investment philosophy and process.

# Our Approach
Describe the fund's overall investment philosophy here — for example, a long-only, fundamentals-driven approach to identifying high-quality businesses trading at a discount to intrinsic value.

# Sector Strategy
Explain how the fund allocates across sectors, any bands or caps set by the investment policy statement, and the reasoning behind current overweight or underweight positions.

# Process
Outline the research and pitch process: how analysts source ideas, the diligence and modeling standards required, and how the investment committee votes on new positions.

# Risk Management
Summarize position sizing limits, stop-loss or review triggers, and how the fund monitors concentration and drawdown risk.`;

export default async function InvestorThesisPage() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));
  const canEdit = hasPortfolioManagerAccess(me);

  const content = getPageContent("investor-thesis") ?? DEFAULT_CONTENT;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Investor Thesis</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <PageContent content={content} />
          {canEdit && <PageContentEditor slug="investor-thesis" initialContent={content} />}
        </div>

        <div className="min-h-[400px]">
          <Image
            src="/images/investor-thesis-1.jpg"
            alt="Investor Thesis"
            width={400}
            height={600}
            className="h-full w-full rounded-lg border border-border object-cover"
          />
        </div>
      </div>
    </div>
  );
}
