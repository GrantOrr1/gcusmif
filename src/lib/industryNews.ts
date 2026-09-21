export type NewsItem = {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
};

const USER_AGENT = "Mozilla/5.0 (compatible; SMIFBot/1.0; +https://smif.example.edu)";

/** Sector code -> RSS feeds to pull for that sector's "Industry News" box. */
const SECTOR_FEEDS: Record<string, { url: string; publisher: string }[]> = {
  HC: [
    { url: "https://www.biopharmadive.com/feeds/news/", publisher: "BioPharma Dive" },
    { url: "https://www.healthcaredive.com/feeds/news/", publisher: "Healthcare Dive" },
    { url: "https://www.fiercepharma.com/rss/xml", publisher: "FiercePharma" },
    { url: "https://www.fiercebiotech.com/rss/xml", publisher: "FierceBiotech" },
    { url: "https://www.fiercehealthcare.com/rss/xml", publisher: "FierceHealthcare" },
    { url: "https://www.statnews.com/feed/", publisher: "STAT News" },
    { url: "https://www.medpagetoday.com/rss/headlines.xml", publisher: "MedPage Today" },
  ],
  ENER: [{ url: "https://oilprice.com/rss/main", publisher: "OilPrice.com" }],
};

/** Shown on the Portfolio Overview page — general world/macro news, not sector-specific. */
const GENERAL_FEED = { url: "https://www.aljazeera.com/xml/rss/all.xml", publisher: "Al Jazeera" };

const WSJ_MARKETS = { url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain", publisher: "WSJ" };
const WSJ_WORLD = { url: "https://feeds.content.dowjones.io/public/rss/RSSWorldNews", publisher: "WSJ" };
const BLOOMBERG_MARKETS = { url: "https://feeds.bloomberg.com/markets/news.rss", publisher: "Bloomberg" };
const NYT_BUSINESS = { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", publisher: "NYT" };
const NYT_US = { url: "https://rss.nytimes.com/services/xml/rss/nyt/US.xml", publisher: "NYT" };
const NYT_WORLD = { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", publisher: "NYT" };
const WAPO_BUSINESS = { url: "https://feeds.washingtonpost.com/rss/business", publisher: "Washington Post" };
const WAPO_NATIONAL = { url: "https://feeds.washingtonpost.com/rss/national", publisher: "Washington Post" };
const WAPO_WORLD = { url: "https://feeds.washingtonpost.com/rss/world", publisher: "Washington Post" };

const MARKET_FEEDS = [
  WSJ_MARKETS,
  BLOOMBERG_MARKETS,
  NYT_BUSINESS,
  WAPO_BUSINESS,
  { url: "https://www.cnbc.com/id/20910258/device/rss/rss.html", publisher: "CNBC" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", publisher: "MarketWatch" },
];

const US_FEEDS = [
  NYT_US,
  WAPO_NATIONAL,
  { url: "https://thehill.com/homenews/feed/", publisher: "The Hill" },
];

const GLOBAL_FEEDS = [
  NYT_WORLD,
  WAPO_WORLD,
  WSJ_WORLD,
  { url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", publisher: "Jerusalem Post" },
  GENERAL_FEED,
];

const EU_FEEDS = [{ url: "https://www.euronews.com/rss?level=theme&name=news", publisher: "Euronews" }];

/** NYT, WSJ, Bloomberg, and Washington Post only — the News tab's "Top News" section. */
const TOP_FEEDS = [
  WSJ_MARKETS,
  WSJ_WORLD,
  BLOOMBERG_MARKETS,
  NYT_BUSINESS,
  NYT_US,
  NYT_WORLD,
  WAPO_BUSINESS,
  WAPO_NATIONAL,
  WAPO_WORLD,
];

/** The News tab's fixed sections, each backed by its own set of feeds. */
const CATEGORY_FEEDS = {
  market: MARKET_FEEDS,
  us: US_FEEDS,
  global: GLOBAL_FEEDS,
  eu: EU_FEEDS,
  energy: SECTOR_FEEDS.ENER,
  healthcare: SECTOR_FEEDS.HC,
} satisfies Record<string, { url: string; publisher: string }[]>;

export type NewsCategory = keyof typeof CATEGORY_FEEDS;

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#0?39;/g, "'")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeEntities(match[1]) : null;
}

/** Handles both RSS's <link>text</link> and Atom's <link href="..."/>. */
function extractLink(block: string): string | null {
  const text = block.match(/<link[^>]*>([^<]+)<\/link>/i);
  if (text && text[1].trim()) return decodeEntities(text[1]);
  const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return href ? decodeEntities(href[1]) : null;
}

/** Minimal hand-rolled RSS/Atom parser — avoids pulling in a full XML library for headline lists. */
function parseFeedXml(xml: string, publisher: string): NewsItem[] {
  const blocks = xml.match(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  const items: NewsItem[] = [];
  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link = extractLink(block);
    if (!title || !link) continue;
    const dateText =
      extractTag(block, "pubDate") ?? extractTag(block, "updated") ?? extractTag(block, "published");
    const parsed = dateText ? new Date(dateText) : null;
    items.push({
      title,
      link,
      publisher,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString(),
    });
  }
  return items;
}

async function fetchFeed(url: string, publisher: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseFeedXml(xml, publisher);
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { data: NewsItem[]; fetchedAt: number }>();

async function fetchFeedCached(url: string, publisher: string): Promise<NewsItem[]> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  try {
    const data = await fetchFeed(url, publisher);
    cache.set(url, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return cached?.data ?? [];
  }
}

function sortByRecent(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/**
 * Picks the most recent `limit` items while giving every publisher a fair turn —
 * a plain recency sort lets whichever source posts most often (e.g. Bloomberg,
 * FierceHealthcare) crowd out every other source from a section.
 */
function interleaveByPublisher(items: NewsItem[], limit: number): NewsItem[] {
  const queues = new Map<string, NewsItem[]>();
  for (const item of sortByRecent(items)) {
    const queue = queues.get(item.publisher);
    if (queue) queue.push(item);
    else queues.set(item.publisher, [item]);
  }
  const publisherQueues = [...queues.values()];
  const result: NewsItem[] = [];
  for (let i = 0; result.length < limit && publisherQueues.some((q) => q.length > 0); i++) {
    const queue = publisherQueues[i % publisherQueues.length];
    const next = queue.shift();
    if (next) result.push(next);
  }
  return result;
}

/** BioPharma Dive/Healthcare Dive for Healthcare, OilPrice.com for Energy — empty elsewhere. */
export async function getSectorIndustryNews(sectorCode: string, limit = 6): Promise<NewsItem[]> {
  const feeds = SECTOR_FEEDS[sectorCode];
  if (!feeds || feeds.length === 0) return [];
  const results = await Promise.all(
    feeds.map((f) => fetchFeedCached(f.url, f.publisher).catch(() => []))
  );
  return interleaveByPublisher(results.flat(), limit);
}

/** One section of the standalone News tab — Market, U.S., Global, Energy, or Healthcare. */
export async function getCategoryNews(category: NewsCategory, limit = 8): Promise<NewsItem[]> {
  const feeds = CATEGORY_FEEDS[category];
  const results = await Promise.all(
    feeds.map((f) => fetchFeedCached(f.url, f.publisher).catch(() => []))
  );
  return interleaveByPublisher(results.flat(), limit);
}

/** NYT, WSJ, Bloomberg, and Washington Post combined, with every publisher fairly represented — the News tab's "Top News" section. */
export async function getTopIndustryNews(limit = 10): Promise<NewsItem[]> {
  const results = await Promise.all(
    TOP_FEEDS.map((f) => fetchFeedCached(f.url, f.publisher).catch(() => []))
  );
  return interleaveByPublisher(results.flat(), limit);
}
