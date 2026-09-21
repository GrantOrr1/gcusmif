import Link from "next/link";
import { getPortfolioData } from "@/lib/portfolio";
import {
  getPortfolioPerformance,
  dailyReturnFromSeries,
  weeklyReturnFromSeries,
} from "@/lib/performance";
import HeroCarousel from "@/components/HeroCarousel";
import StatBox from "@/components/home/StatBox";
import WelcomeBackModal from "@/components/home/WelcomeBackModal";

const HERO_SLIDES = [
  {
    src: "/images/home-hero.jpg",
    alt: "Phoenix desert landscape near Grand Canyon University",
    objectPosition: "center 68%",
  },
  {
    src: "/images/home-hero-2.jpg",
    alt: "Old Town Scottsdale at sunset",
  },
  {
    src: "/images/home-hero-3.jpg",
    alt: "Phoenix-area golf course with palm trees",
  },
  {
    src: "/images/home-hero-4.jpg",
    alt: "Grand Canyon University campus buildings",
  },
  {
    src: "/images/home-hero-5.jpg",
    alt: "Downtown Phoenix skyline at sunset",
  },
  {
    src: "/images/home-hero-6.jpg",
    alt: "Overlook of the Grand Canyon through a desert tree",
  },
  {
    src: "/images/home-hero-7.jpg",
    alt: "Palm-lined beach along the Colorado River in Arizona",
  },
  {
    src: "/images/home-hero-8.jpg",
    alt: "Desert foothill homes among saguaro cacti near Phoenix",
  },
  {
    src: "/images/home-hero-9.jpg",
    alt: "Scottsdale Waterfront canal lined with palm trees",
  },
  {
    src: "/images/home-hero-10.jpg",
    alt: "Joshua trees in the Arizona desert with mountains in the distance",
  },
];

export default async function Home() {
  const data = await getPortfolioData();
  const { summary, ytdPortfolioReturn } = data;
  const fiveDaySeries = await getPortfolioPerformance("5d");
  const dailyReturn = dailyReturnFromSeries(fiveDaySeries);
  const weeklyReturn = weeklyReturnFromSeries(fiveDaySeries);
  const ytdReturn = ytdPortfolioReturn;

  return (
    <div>
      <WelcomeBackModal />
      <section className="relative overflow-hidden">
        <HeroCarousel slides={HERO_SLIDES} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

        <div className="relative mx-auto max-w-6xl px-4 py-28 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Grand Canyon University
            <br />
            Student Managed Investment Fund
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-200">
            A student-run equity portfolio, managed with institutional
            discipline and tracked live for our analysts and the public.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/portfolio"
              className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              View Portfolio
            </Link>
            <Link
              href="/investor-thesis"
              className="rounded-md border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Read Our Thesis
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatBox label="Total Value" value={summary.totalValue} kind="currency" />
          <StatBox
            label="YTD Return"
            value={ytdReturn}
            kind="percent"
            tone={ytdReturn === null ? "neutral" : ytdReturn >= 0 ? "positive" : "negative"}
          />
          <StatBox
            label="Daily Return"
            value={dailyReturn}
            kind="percent"
            tone={dailyReturn === null ? "neutral" : dailyReturn >= 0 ? "positive" : "negative"}
          />
          <StatBox
            label="Weekly Return"
            value={weeklyReturn}
            kind="percent"
            tone={weeklyReturn === null ? "neutral" : weeklyReturn >= 0 ? "positive" : "negative"}
          />
        </div>
      </section>
    </div>
  );
}
