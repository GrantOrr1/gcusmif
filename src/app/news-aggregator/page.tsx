import { auth } from "@/auth";
import { getCategoryNews, getTopIndustryNews } from "@/lib/industryNews";
import IndustryNews from "@/components/portfolio/IndustryNews";

export const metadata = {
  title: "News Aggregator | Student Managed Investment Fund",
};

export default async function NewsAggregatorPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">News Aggregator</h1>
        <p className="mt-4 text-sm text-muted">
          This page is only available to logged-in analysts.
        </p>
      </div>
    );
  }

  const [top, market, us, global, eu, energy, healthcare] = await Promise.all([
    getTopIndustryNews(10).catch(() => []),
    getCategoryNews("market", 8).catch(() => []),
    getCategoryNews("us", 8).catch(() => []),
    getCategoryNews("global", 8).catch(() => []),
    getCategoryNews("eu", 8).catch(() => []),
    getCategoryNews("energy", 8).catch(() => []),
    getCategoryNews("healthcare", 8).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">News Aggregator</h1>

      <div className="mt-6 grid sm:grid-cols-2 sm:gap-x-8">
        <IndustryNews title="Top News" items={top} emptyMessage="No headlines available right now." />
        <IndustryNews title="Market News" items={market} emptyMessage="No market headlines available right now." />
        <IndustryNews title="U.S. News" items={us} emptyMessage="No U.S. headlines available right now." />
        <IndustryNews title="Global News" items={global} emptyMessage="No global headlines available right now." />
        <IndustryNews title="Energy News" items={energy} emptyMessage="No energy headlines available right now." />
        <IndustryNews
          title="Healthcare News"
          items={healthcare}
          emptyMessage="No healthcare headlines available right now."
        />
        <IndustryNews title="EU News" items={eu} emptyMessage="No EU headlines available right now." />
      </div>
    </div>
  );
}
