import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getPageContent } from "@/lib/sitePages";
import PageContent from "@/components/pages/PageContent";
import PageContentEditor from "@/components/pages/PageContentEditor";

export const metadata = {
  title: "About | Student Managed Investment Fund",
};

const DEFAULT_CONTENT = "Content coming soon.";

export default async function AboutPage() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));
  const canEdit = hasPortfolioManagerAccess(me);

  const content = getPageContent("about") ?? DEFAULT_CONTENT;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">About</h1>
      <div className="mt-4">
        <PageContent content={content} />
      </div>

      {canEdit && <PageContentEditor slug="about" initialContent={content} />}
    </div>
  );
}
