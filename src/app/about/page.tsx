import Link from "next/link";
import type { ReactNode } from "react";
import AboutHero from "@/components/about/AboutHero";
import SectionHeader from "@/components/about/SectionHeader";
import Reveal from "@/components/about/Reveal";
import Philosophy from "@/components/about/Philosophy";
import AnalystStory from "@/components/about/AnalystStory";
import DiscountRate from "@/components/about/DiscountRate";
import MockDcf from "@/components/about/MockDcf";
import LegacyCycle from "@/components/about/LegacyCycle";
import ValueMatrix from "@/components/about/ValueMatrix";
import DcfBuilder from "@/components/about/DcfBuilder";
import MarginOfSafety from "@/components/about/MarginOfSafety";
import CompoundingChart from "@/components/about/CompoundingChart";
import BondSeesaw from "@/components/about/BondSeesaw";
import { Learning, WeekStrip } from "@/components/about/LearnAndMeet";

export const metadata = {
  title: "About | Student Managed Investment Fund",
};

function Band({ children, tinted = false }: { children: ReactNode; tinted?: boolean }) {
  return (
    <section className={tinted ? "border-y border-border bg-surface/60" : ""}>
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="overflow-x-clip">
      <AboutHero />

      {/* Who we are */}
      <Band tinted>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <SectionHeader eyebrow="What is the SMIF?" title="Students managing real capital.">
            <p>
              The SMIF is a small group of hard-working Grand Canyon University students that manage
              over $5 million in AUM. The SMIF provides students the opportunity to manage real
              investments in both debt and equity securities: $1.3 million is invested in equities,
              and the rest is held in debt securities.
            </p>
            <p>
              The goal of the SMIF is for students to cultivate their financial knowledge and
              skillsets, while making our investors consistently high returns.
            </p>
            <p>
              Nobody expects you to arrive as a professional. But because the money is real, the work is
              held to a real standard, and that&apos;s where you build skills a classroom alone can&apos;t
              give you.
            </p>
          </SectionHeader>
          <Reveal delay={150}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { k: "$5M+", v: "Assets under management" },
                { k: "$1.3M", v: "In equities, the rest in debt securities" },
                { k: "9", v: "Value investing principles" },
                { k: "30+", v: "People you'll present in front of" },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl border border-border bg-background p-5">
                  <p className="text-[32px] font-bold tracking-tight text-brand">{s.k}</p>
                  <p className="mt-1 text-[14px] text-body">{s.v}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Band>

      {/* Analyst journey: scroll-driven sketch story */}
      <Band>
        <SectionHeader eyebrow="The analyst journey" title="From applicant to analyst.">
          <p>Nine chapters, from your application to graduation. Keep scrolling to watch it unfold.</p>
        </SectionHeader>
        <div className="mt-6">
          <AnalystStory />
        </div>
      </Band>

      {/* Philosophy */}
      <Band>
        <Philosophy />
        <Reveal className="mt-10 max-w-3xl">
          <p className="text-[16px] leading-relaxed text-body">
            While Buffett&apos;s principles are fundamental to our investment strategy, they are not set
            in stone. Through your experience in the SMIF you will learn that different industries
            require adjustments to approaching investment theses.
          </p>
        </Reveal>
      </Band>

      {/* Relative value matrix */}
      <Band tinted>
        <SectionHeader eyebrow="Relative value" title="Where value stocks live.">
          <p>
            A company&apos;s relative value is determined by comparing its stock price to other stocks.
            Comparing a stock&apos;s P/E ratio to its growth rate shows whether the market is overpaying
            or underpaying for its earnings, and it works even for stocks that don&apos;t pay dividends.
          </p>
          <p>Hover a quadrant, or drag the sliders to place your own stock.</p>
        </SectionHeader>
        <div className="mt-12">
          <ValueMatrix />
        </div>
      </Band>

      {/* Intrinsic value */}
      <Band>
        <SectionHeader eyebrow="Intrinsic value" title="What is a business actually worth?">
          <p>
            A Discounted Cash Flow model values a company by the free cash flow it will generate, the
            cash actually left for investors after the business pays to sustain its operations. A
            dollar ten years from now is worth less than a dollar today, so each year&apos;s cash flow is
            discounted back to the present.
          </p>
        </SectionHeader>
        <Reveal className="mt-12">
          <DiscountRate />
        </Reveal>
        <Reveal className="mt-14 max-w-2xl">
          <p className="text-[16px] leading-relaxed text-body">
            Now put it to work. A DCF applies that same discount rate to every year of a company&apos;s
            forecast cash flow. Raise the rate and watch what the future is worth today.
          </p>
        </Reveal>
        <div className="mt-8">
          <DcfBuilder />
        </div>
      </Band>

      {/* Mock DCF walkthrough */}
      <Band tinted>
        <SectionHeader eyebrow="Inside the model" title="Build a DCF, one row at a time.">
          <p>
            Here is a simplified version of the model our analysts build, for a made-up company. Step
            through it to see how revenue turns into free cash flow, and free cash flow turns into a
            price per share. Click any number to see its formula, or move the assumptions and watch
            the whole model update.
          </p>
        </SectionHeader>
        <Reveal className="mt-12">
          <MockDcf />
        </Reveal>
      </Band>

      {/* Margin of safety */}
      <Band>
        <SectionHeader eyebrow="Margin of safety" title="Then we wait for a discount.">
          <p>
            Even a careful DCF rests on assumptions. Buying at least 15% below intrinsic value leaves a
            cushion in case some of those assumptions turn out wrong. Slide the market price to see
            where we&apos;d act.
          </p>
        </SectionHeader>
        <div className="mt-12">
          <MarginOfSafety />
        </div>
      </Band>

      {/* Long term */}
      <Band tinted>
        <SectionHeader eyebrow="Long-term holding" title="Time does the heavy lifting.">
          <p>
            We are not day-traders. Earning a higher return, or the same return for more years,
            magnifies the power of compounding. Here is $100 growing at 5%, 10% and 15%.
          </p>
        </SectionHeader>
        <div className="mt-12">
          <CompoundingChart />
        </div>
      </Band>

      {/* Debt */}
      <Band>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeader eyebrow="Debt securities" title="Not just stocks.">
            <p>
              The SMIF manages debt as well as equity. In fact, most of the fund is in debt
              securities, with $1.3 million in equities and the rest in debt. With bonds, the key relationship runs in
              reverse: when market interest rates rise, the price of an existing bond falls, and when
              rates fall, its price rises.
            </p>
            <p>Move the market rate and watch the seesaw.</p>
          </SectionHeader>
          <Reveal delay={150}>
            <BondSeesaw />
          </Reveal>
        </div>
      </Band>

      {/* What you'll learn */}
      <Band tinted>
        <SectionHeader eyebrow="What you'll learn" title="Skills you'll use for a career.">
          <p>As a Student Analyst you will have the opportunity, and the requirement, to learn:</p>
        </SectionHeader>
        <div className="mt-12">
          <Learning />
        </div>
        <Reveal className="mt-10 max-w-3xl">
          <p className="text-[16px] leading-relaxed text-body">
            All of the above, and possibly more, will be expected from you, but it will also be taught to
            you. We don&apos;t expect you to be able to accomplish everything right away.
          </p>
        </Reveal>
      </Band>

      {/* Taught by our own */}
      <Band>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <SectionHeader eyebrow="Taught by our own" title="Knowledge that passes from class to class.">
            <p>
              Much of what you learn in the SMIF, you learn from other students. Senior analysts and
              Sector Heads walk newer members through the filings, the models and the pitches, the same
              way they were taught when they joined.
            </p>
            <p>
              Each year, a class graduates into their careers and the next one steps up. What they built,
              and what they learned along the way, stays with the fund and gets passed on.
            </p>
          </SectionHeader>
          <Reveal delay={150}>
            <LegacyCycle />
          </Reveal>
        </div>
      </Band>

      {/* When we meet */}
      <Band tinted>
        <SectionHeader eyebrow="When we meet" title="Two days a week, all year.">
          <p>
            We meet every Saturday at 10am, and members are required to attend a 1 credit course on
            Mondays in the Charles Schwab Center. While we do allow exceptions on a case-by-case weekly
            basis, generally you will be expected to meet at these times every week throughout the
            academic year.
          </p>
        </SectionHeader>
        <div className="mt-12">
          <WeekStrip />
        </div>
      </Band>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="float-slow absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-3xl" />
        </div>
        <Reveal className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <h2 className="text-balance text-[36px] font-bold leading-tight tracking-tight text-foreground sm:text-[52px]">
            Interested in <span className="text-shimmer">joining?</span>
          </h2>
          <p className="mt-3 text-[22px] font-semibold text-foreground sm:text-[26px]">
            Learn about our application process.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-body">
            Applications open at or shortly after the start of each fall and spring semester.
          </p>
          {/* equal space above and below so the tag sits centered between the text and the button */}
          <div className="mt-8 flex justify-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-positive/40 bg-positive/10 px-4 py-1.5 text-[14px] font-semibold text-positive">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
              </span>
              Applications opening soon
            </p>
          </div>
          <Link
            href="/applications"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-brand/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-xl"
          >
            Apply to the SMIF
            <span aria-hidden>→</span>
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
