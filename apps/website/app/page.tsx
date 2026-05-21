"use client";

import { ArrowRight, Github, Package, Sparkles } from "lucide-react";

import { AnimatedShinyText } from "@workspace/ui/components/magicui/animated-shiny-text";
import { AuroraText } from "@workspace/ui/components/aurora-text";
import { BlurFade } from "@workspace/ui/components/magicui/blur-fade";
import { DotPattern } from "@workspace/ui/components/magicui/dot-pattern";
import { cn } from "@workspace/ui/lib/utils";

import {
  AgentsBento,
  BentoFeatures,
  BentoFeaturesSecondary,
} from "@/components/marketing/bento-features";
import { FaqSection } from "@/components/marketing/faq-section";
import { FlowBeams } from "@/components/marketing/flow-beams";
import { HeroPreviewCard } from "@/components/marketing/hero-preview-card";
import { PositioningCards } from "@/components/marketing/positioning-cards";
import { PricingTiers } from "@/components/marketing/pricing-tiers";
import { PrinciplesBand } from "@/components/marketing/principles-band";
import { Section } from "@/components/marketing/section";

export default function HomePage() {
  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        {/* Background — dots + soft halo (extends behind the floating nav) */}
        <DotPattern
          className={cn(
            "[mask-image:radial-gradient(1100px_circle_at_top_right,white,transparent)]",
            "fill-sky-300/35",
          )}
          width={28}
          height={28}
          cr={1}
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-14 px-6 pb-12 pt-32 md:grid-cols-[1.1fr_0.9fr] md:pt-40 md:pb-20">
          <div className="flex flex-col items-start">
            <BlurFade delay={0.05} inView>
              <a
                href="https://github.com/slashcash"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3.5 py-1 text-[0.78rem] font-medium text-neutral-600 backdrop-blur-md shadow-sm transition hover:bg-white"
              >
                <span
                  className="grid h-4 w-4 place-items-center rounded-full text-[0.55rem] font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
                  }}
                  aria-hidden="true"
                >
                  ✨
                </span>
                <AnimatedShinyText className="!text-neutral-700">
                  Slash Cash · open-source CLI today · local-first by design
                </AnimatedShinyText>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </a>
            </BlurFade>

            <BlurFade delay={0.12} inView>
              <h1 className="mt-6 text-balance text-[3.1rem] font-bold leading-[1.02] tracking-tight md:text-[3.8rem]">
                Your{" "}
                <AuroraText
                  colors={[
                    "#635bff",
                    "#2f6ceb",
                    "#0ea5e9",
                    "#14b8a6",
                  ]}
                  speed={1.2}
                >
                  AI finance team
                </AuroraText>{" "}
                <br className="hidden md:block" />
                that actually fixes things.
              </h1>
            </BlurFade>

            <BlurFade delay={0.2} inView>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-neutral-500 md:text-[1.12rem]">
                Seven small agents categorize your spends, find leaks, score your
                money health, and tell you{" "}
                <span className="font-semibold text-neutral-900">
                  one clear thing to fix
                </span>{" "}
                each week. Open-source and{" "}
                <span className="font-semibold text-neutral-900">
                  runs locally on your machine
                </span>
                {" — "}your finances never leave your laptop.
              </p>
            </BlurFade>

            <BlurFade delay={0.28} inView>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="https://www.npmjs.com/package/slashcash"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.92rem] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(47,108,235,0.4)] transition hover:opacity-95"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
                  }}
                >
                  <Package className="h-3.5 w-3.5" />
                  Install the CLI
                </a>
                <a
                  href="https://github.com/slashcash"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-[0.92rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  <Github className="h-3.5 w-3.5" />
                  Source on GitHub
                </a>
                <span className="inline-flex h-11 items-center rounded-full border border-dashed border-black/15 bg-white/70 px-5 text-[0.92rem] font-medium text-neutral-500">
                  Hosted SaaS dashboard — on the roadmap
                </span>
              </div>
            </BlurFade>

            <BlurFade delay={0.36} inView>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.78rem] font-medium text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  SQLite on disk · zero hosted ledger
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#635bff]" />
                  Works with UPI · cards · email
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2f6ceb]" />
                  Open-source CLI
                </span>
              </div>
            </BlurFade>
          </div>

          <BlurFade delay={0.3} inView>
            <div className="flex justify-center md:justify-end">
              <HeroPreviewCard />
            </div>
          </BlurFade>
        </div>
      </section>

      {/* TRUST STRIP / SOCIAL PROOF */}
      <Section className="!py-10" align="center" title="" containerClassName="">
        <BlurFade inView>
              <div className="rounded-2xl border border-black/5 bg-white/60 px-6 py-5 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
              <span className="max-w-md text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-neutral-500 md:max-w-none">
                Personal finance without the surveillance business model
              </span>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.85rem] font-medium text-neutral-700">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-sky-600" /> Auditable agents
                </span>
                <span>·</span>
                <span>Open core on GitHub</span>
                <span>·</span>
                <span>India-native money flows</span>
                <span>·</span>
                <span>Shipped as a real CLI</span>
              </div>
            </div>
          </div>
        </BlurFade>
      </Section>

      {/* POSITIONING — why we exist */}
      <Section
        id="why"
        eyebrow="Why Slash Cash"
        title={
          <>
            The wedge is{" "}
            <AuroraText colors={["#635bff", "#2f6ceb", "#0ea5e9"]}>
              trust
            </AuroraText>
            , not another chart.
          </>
        }
        description="Investors and users ask the same three questions: who holds the data, who moves the money, and what happens when the hype cycle ends. Here is how we answer."
      >
        <PositioningCards />
      </Section>

      {/* FEATURES BENTO */}
      <Section
        id="features"
        eyebrow="What it does"
        title={
          <>
            Built for the way{" "}
            <AuroraText colors={["#635bff", "#2f6ceb", "#0ea5e9"]}>
              modern money
            </AuroraText>{" "}
            actually moves.
          </>
        }
        description="UPI, multiple cards, a dozen subscriptions, four bank accounts, three SIPs. Slash Cash sees the whole picture — and turns it into one clear next move."
      >
        <BentoFeatures />
        <div className="mt-4">
          <BentoFeaturesSecondary />
        </div>
      </Section>

      {/* HOW IT WORKS — animated beams */}
      <Section
        id="how"
        eyebrow="How it works"
        title={
          <>
            Your sources go in.{" "}
            <AuroraText colors={["#2f6ceb", "#0ea5e9", "#14b8a6"]}>
              Decisions
            </AuroraText>{" "}
            come out.
          </>
        }
        description="Slash Cash reads from sources you approve, runs every agent locally, and produces a dashboard that's already done the thinking."
      >
        <FlowBeams />
      </Section>

      {/* AGENTS — orbit */}
      <Section
        id="agents"
        eyebrow="Meet the team"
        title={
          <>
            Seven specialists.{" "}
            <AuroraText colors={["#14b8a6", "#2f6ceb"]}>One job each.</AuroraText>
          </>
        }
        description="No mega-model trying to do everything. Each agent is a small, inspectable program with one clear responsibility."
      >
        <AgentsBento />
      </Section>

      {/* PRINCIPLES — honest architecture story */}
      <Section
        eyebrow="Architecture"
        title="Privacy promises you can verify."
        description="We do not publish vanity “transactions processed” counters. If a metric is not true on every install, it does not belong on the homepage."
      >
        <PrinciplesBand />
      </Section>

      {/* FAQ */}
      <Section
        id="faq"
        eyebrow="FAQ"
        title="What founders, users, and partners ask first."
        description="Straight answers — the same ones we give in diligence."
      >
        <div className="mx-auto max-w-2xl">
          <FaqSection />
        </div>
      </Section>

      {/* PRICING */}
      <Section
        id="pricing"
        eyebrow="Pricing"
        title={
          <>
            Simple tiers.{" "}
            <AuroraText colors={["#635bff", "#2f6ceb"]}>
              Your data stays on your disk.
            </AuroraText>
          </>
        }
        description="The engine is open-source. When paid plans ship, they'll fund connectors and workflows — never rent-seeking access to money you already own."
      >
        <PricingTiers />
      </Section>

      {/* FINAL CTA */}
      <section className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-[1180px] px-6 pb-24">
          <div
            className="relative overflow-hidden rounded-3xl border border-black/5 p-10 md:p-16"
            style={{
              background:
                "linear-gradient(135deg, #ffffff 0%, rgba(99,91,255,0.045) 50%, rgba(20,184,166,0.05) 100%)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 24px 64px -16px rgba(47,108,235,0.18)",
            }}
          >
            <DotPattern
              className={cn(
                "[mask-image:radial-gradient(700px_circle_at_top_right,white,transparent)]",
                "fill-sky-200/28",
              )}
              width={22}
              height={22}
              cr={1}
              aria-hidden="true"
            />
            <div className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <span className="slash-eyebrow">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-4))",
                    }}
                  />
                  Get started free
                </span>
                <h2 className="mt-4 text-[2.2rem] font-bold leading-[1.05] tracking-tight md:text-[2.8rem]">
                  Stop watching dashboards.
                  <br />
                  <AuroraText
                    colors={[
                      "#635bff",
                      "#2f6ceb",
                      "#0ea5e9",
                      "#14b8a6",
                    ]}
                  >
                    Start fixing money.
                  </AuroraText>
                </h2>
                <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-neutral-500 md:text-[1.05rem]">
                  Install the open-source CLI, point it at the sources you
                  already use, and let your agents prepare the next weekly brief
                  on your device — overnight.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-3 md:items-end">
                <a
                  href="https://www.npmjs.com/package/slashcash"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[0.92rem] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(47,108,235,0.35)] transition hover:opacity-95 md:w-auto"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
                  }}
                >
                  <Package className="h-4 w-4" />
                  Get slashcash on npm
                </a>
                <a
                  href="https://github.com/slashcash"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-6 text-[0.92rem] font-semibold text-neutral-700 transition hover:bg-neutral-50 md:w-auto"
                >
                  <Github className="h-4 w-4" />
                  Browse the repo
                </a>
                <span className="text-center text-[0.85rem] text-neutral-400 md:text-right">
                  Hosted SaaS is on the roadmap after the open-source core feels
                  bulletproof in the wild.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
