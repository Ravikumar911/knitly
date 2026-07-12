"use client";

import {
  ArrowRight,
  AppWindow,
  Database,
  Github,
  MailCheck,
  Package,
  Sparkles,
} from "lucide-react";

import { AnimatedShinyText } from "@workspace/ui/components/magicui/animated-shiny-text";
import { AuroraText } from "@workspace/ui/components/aurora-text";
import { BlurFade } from "@workspace/ui/components/magicui/blur-fade";
import { DotPattern } from "@workspace/ui/components/magicui/dot-pattern";
import { cn } from "@workspace/ui/lib/utils";

import {
  BentoFeatures,
  BentoFeaturesSecondary,
} from "@/components/marketing/bento-features";
import { FaqSection } from "@/components/marketing/faq-section";
import { FlowBeams } from "@/components/marketing/flow-beams";
import { HeroPreviewCard } from "@/components/marketing/hero-preview-card";
import { PositioningCards } from "@/components/marketing/positioning-cards";
import { PrinciplesBand } from "@/components/marketing/principles-band";
import { Section } from "@/components/marketing/section";
import { TestimonialMarquee } from "@/components/marketing/testimonial-marquee";
import { GITHUB_URL, NPM_URL } from "@/lib/links";

const trustItems = [
  "No bank login",
  "No cloud account",
  "Open source",
  "Runs on your laptop",
  "Desktop shell",
  "Reads receipts",
  "Private by default",
];

const demoSteps = [
  {
    icon: AppWindow,
    label: "Install",
    title: "Open slash.cash",
    body: "Use the desktop shell or install from npm. Either path starts the same local dashboard and keeps the runtime on your machine.",
  },
  {
    icon: MailCheck,
    label: "Connect",
    title: "Connect Gmail safely",
    body: "Use a Gmail app password, like a mail client. slash.cash reads matching receipts and does not get a full Google account login.",
  },
  {
    icon: Database,
    label: "Review",
    title: "See your spending",
    body: "Open the dashboard on your laptop and see food-delivery spending, restaurants, fees, and monthly trends.",
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
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

        <div className="relative mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-6 pb-8 pt-28 md:grid-cols-[1.1fr_0.9fr] md:pb-10 md:pt-32">
          <div className="flex flex-col items-start">
            <BlurFade delay={0.05} inView>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3.5 py-1 text-[0.78rem] font-medium text-neutral-600 shadow-sm backdrop-blur-md transition hover:bg-white"
              >
                <span
                  className="grid h-4 w-4 place-items-center rounded-full text-[0.55rem] font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
                  }}
                  aria-hidden="true"
                >
                  /
                </span>
                <AnimatedShinyText className="!text-neutral-700">
                  Private spending dashboard · runs on your laptop
                </AnimatedShinyText>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </a>
            </BlurFade>

            <BlurFade delay={0.12} inView>
              <h1
                aria-label="Take control of your personal finances without giving up your data."
                className="mt-6 text-balance text-[3.1rem] font-bold leading-[1.02] tracking-tight md:text-[3.8rem]"
              >
                Take control of your{" "}
                <span aria-hidden="true" className="slash-grad-text">
                  personal finances
                </span>{" "}
                without giving up your data.
              </h1>
            </BlurFade>

            <BlurFade delay={0.2} inView>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-neutral-500 md:text-[1.12rem]">
                slash.cash reads receipts from your inbox and turns them into a
                clean spending dashboard. Start with Swiggy receipts today, then
                use the local dashboard from the desktop shell or CLI. Your
                numbers stay on your laptop.
              </p>
            </BlurFade>

            <BlurFade delay={0.28} inView>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={NPM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.92rem] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(47,108,235,0.4)] transition hover:opacity-95"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
                  }}
                >
                  <Package className="h-3.5 w-3.5" />
                  Install for free
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-[0.92rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  <Github className="h-3.5 w-3.5" />
                  Source on GitHub
                </a>
              </div>
            </BlurFade>

            <BlurFade delay={0.36} inView>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.78rem] font-medium text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  No cloud account
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#635bff]" />
                  Works from receipts
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2f6ceb]" />
                  Desktop shell
                </span>
              </div>
            </BlurFade>
          </div>

          <div className="flex justify-center md:justify-end">
            <HeroPreviewCard />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <Section className="!py-10" align="center" title="" containerClassName="">
        <BlurFade inView>
          <div className="rounded-2xl border border-black/5 bg-white/60 px-6 py-5 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
              <span className="max-w-md text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-neutral-500 md:max-w-none">
                Built for trust before scale
              </span>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.85rem] font-medium text-neutral-700">
                {trustItems.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </BlurFade>
      </Section>

      {/* PROBLEM */}
      <Section
        id="why"
        eyebrow="The problem"
        title={
          <>
            Finance apps keep asking for{" "}
            <AuroraText colors={["#635bff", "#2f6ceb", "#0ea5e9"]}>
              too much trust.
            </AuroraText>
          </>
        }
        description="Most money apps ask for your bank login, your inbox, or a new cloud account before showing value. slash.cash starts smaller: read the receipts you approve, show the truth clearly, and keep the data with you."
      >
        <PositioningCards />
      </Section>

      {/* MECHANICS */}
      <Section
        id="features"
        eyebrow="How it solves it"
        title={
          <>
            From{" "}
            <AuroraText colors={["#635bff", "#2f6ceb", "#0ea5e9"]}>
              receipt to clarity.
            </AuroraText>
          </>
        }
        description="The product is intentionally focused: food-delivery receipts in, simple spending answers out. No spreadsheet cleanup. No hosted finance account."
      >
        <BentoFeatures />
        <div className="mt-4">
          <BentoFeaturesSecondary />
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section
        id="how"
        eyebrow="Mechanics"
        title={
          <>
            Receipts go in.{" "}
            <AuroraText colors={["#2f6ceb", "#0ea5e9", "#14b8a6"]}>
              Answers
            </AuroraText>{" "}
            come out.
          </>
        }
        description="slash.cash looks for the receipts you choose, reads the useful details, and turns them into charts you can understand at a glance."
      >
        <FlowBeams />
      </Section>

      {/* DEMO */}
      <Section
        id="demo"
        eyebrow="How it feels"
        title="From setup to a useful dashboard."
        description="Three steps: install, connect Gmail, review spending. The privacy details are there when you want them, but the product should feel simple first."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {demoSteps.map((step, index) => (
            <div
              key={step.title}
              className="slash-bento-card flex min-h-[280px] flex-col gap-5 p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-black/5 bg-white shadow-[0_4px_16px_-4px_rgba(47,108,235,0.12)]"
                  aria-hidden="true"
                >
                  <step.icon className="h-5 w-5 text-[#2f6ceb]" />
                </span>
                <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  0{index + 1}
                </span>
              </div>
              <div>
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-sky-800">
                  {step.label}
                </span>
                <h3 className="mt-2 text-[1.2rem] font-semibold tracking-tight text-neutral-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-neutral-500">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* VALIDATION */}
      <Section
        id="testimonials"
        eyebrow="Validation"
        title="Built around the questions people actually ask."
        description="People want to know what it reads, where the data goes, and whether the dashboard is worth the setup. The answers are designed into the product."
      >
        <TestimonialMarquee />
      </Section>

      {/* PRINCIPLES */}
      <Section
        eyebrow="Privacy"
        title="Plain promises, backed by code."
        description="The app is open source, the dashboard runs on your machine, and receipt reading happens locally. The technical details are inspectable in the repo."
      >
        <PrinciplesBand />
      </Section>

      {/* FAQ */}
      <Section
        id="faq"
        eyebrow="FAQ"
        title="Straight answers before you try it."
        description="What it reads, what it cannot do, and how private setup works."
      >
        <div className="mx-auto max-w-2xl">
          <FaqSection />
        </div>
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
                  Try it free
                </span>
                <h2 className="mt-4 text-[2.2rem] font-bold leading-[1.05] tracking-tight md:text-[2.8rem]">
                  See your spending without handing over your data.
                </h2>
                <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-neutral-500 md:text-[1.05rem]">
                  Install slash.cash, connect Gmail, and open a private
                  dashboard on your laptop.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-3 md:items-end">
                <a
                  href={NPM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[0.92rem] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(47,108,235,0.35)] transition hover:opacity-95 md:w-auto"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
                  }}
                >
                  <Package className="h-4 w-4" />
                  Install slash.cash
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-6 text-[0.92rem] font-semibold text-neutral-700 transition hover:bg-neutral-50 md:w-auto"
                >
                  <Github className="h-4 w-4" />
                  View source
                </a>
                <span className="text-center text-[0.85rem] text-neutral-400 md:text-right">
                  No credit card. No cloud account. Setup starts in your
                  terminal.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
