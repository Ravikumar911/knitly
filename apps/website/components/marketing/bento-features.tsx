"use client";

import { motion } from "motion/react";
import { Plug, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";

import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from "@workspace/ui/components/magicui/terminal";
import { Globe } from "@workspace/ui/components/magicui/globe";
import { NumberTicker } from "@workspace/ui/components/magicui/number-ticker";
import { cn } from "@workspace/ui/lib/utils";

import { SyncNotifications } from "./agent-notifications";
import { PipelineOrbit } from "./agents-orbit";

interface BentoCellProps {
  className?: string;
  eyebrow?: string;
  title: string;
  description: string;
  visual: React.ReactNode;
  /** "stack" = visual on top, text below; "split" = visual right, text left; "bg" = visual fills card behind text */
  layout?: "stack" | "split" | "bg";
}

function BentoCell({
  className,
  eyebrow,
  title,
  description,
  visual,
  layout = "stack",
}: BentoCellProps) {
  return (
    <motion.div
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group slash-bento-card relative flex overflow-hidden",
        layout === "split" ? "flex-col md:flex-row" : "flex-col",
        className,
      )}
    >
      {layout === "bg" && (
        <>
          <div className="pointer-events-none absolute inset-0 z-0">
            {visual}
          </div>
          <div className="relative z-10 mt-auto flex flex-col gap-2 p-6">
            {eyebrow && <BentoEyebrow>{eyebrow}</BentoEyebrow>}
            <h3 className="text-[1.2rem] font-semibold tracking-tight text-neutral-900">
              {title}
            </h3>
            <p className="max-w-md text-[0.9rem] leading-relaxed text-neutral-500">
              {description}
            </p>
          </div>
        </>
      )}

      {layout === "stack" && (
        <>
          <div className="relative h-[260px] flex-none overflow-hidden">
            {visual}
          </div>
          <div className="relative z-10 flex flex-col gap-2 p-6">
            {eyebrow && <BentoEyebrow>{eyebrow}</BentoEyebrow>}
            <h3 className="text-[1.2rem] font-semibold tracking-tight text-neutral-900">
              {title}
            </h3>
            <p className="max-w-md text-[0.9rem] leading-relaxed text-neutral-500">
              {description}
            </p>
          </div>
        </>
      )}

      {layout === "split" && (
        <>
          <div className="relative order-last min-h-[240px] w-full overflow-hidden md:order-none md:w-1/2">
            {visual}
          </div>
          <div className="relative z-10 flex flex-col justify-center gap-2 p-6 md:w-1/2 md:p-8">
            {eyebrow && <BentoEyebrow>{eyebrow}</BentoEyebrow>}
            <h3 className="text-[1.2rem] font-semibold tracking-tight text-neutral-900">
              {title}
            </h3>
            <p className="max-w-md text-[0.9rem] leading-relaxed text-neutral-500">
              {description}
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}

function BentoEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-sky-800">
      {children}
    </span>
  );
}

export function BentoFeatures() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
      {/* ROW 1 ─────────────────────────────────────────────── */}

      {/* CELL A — Globe / local-first (wide, 2 cols) */}
      <BentoCell
        className="md:col-span-2 min-h-[360px]"
        eyebrow="Private by default"
        title="Your spending stays with you"
        description="slash.cash runs on your laptop. Your receipts and spending history are not copied into a Slash Cash cloud account."
        layout="split"
        visual={
          <div className="relative h-full w-full">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, rgba(47,108,235,0.14), transparent 60%), radial-gradient(circle at 70% 80%, rgba(20,184,166,0.1), transparent 50%)",
              }}
            />
            <Globe className="!relative !top-auto !bottom-[-180px] !mx-auto !aspect-square !w-[110%]" />
          </div>
        }
      />

      {/* CELL B — Live sync notifications (1 col) */}
      <BentoCell
        className="md:col-span-1 min-h-[360px]"
        eyebrow="Inbox receipts"
        title="No bank login required"
        description="Start with Gmail receipts. You approve the connection, slash.cash reads matching order emails, and your dashboard fills itself in."
        layout="stack"
        visual={
          <div className="absolute inset-0 px-5 pt-5">
            <SyncNotifications className="h-full" />
          </div>
        }
      />

      {/* ROW 2 ─────────────────────────────────────────────── */}

      {/* CELL C — Score gradient stat */}
      <BentoCell
        className="md:col-span-1 min-h-[380px]"
        eyebrow="Instant clarity"
        title="Know what food delivery costs"
        description="See total spend, favorite restaurants, fees, and monthly movement without maintaining a spreadsheet."
        layout="bg"
        visual={
          <div className="flex h-full flex-col items-center justify-start pt-10">
            <div
              className="text-[6rem] font-bold leading-none tabular-nums tracking-tight"
              style={{ letterSpacing: "0" }}
            >
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #635bff 0%, #2f6ceb 50%, #0ea5e9 100%)",
                }}
              >
                <NumberTicker value={42} className="!text-transparent" />
              </span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[0.72rem] font-semibold text-emerald-700">
              <Sparkles className="h-3 w-3" /> receipts parsed
            </div>
          </div>
        }
      />

      {/* CELL D — Terminal (CLI demo) */}
      <BentoCell
        className="md:col-span-1 min-h-[380px]"
        eyebrow="Simple setup"
        title="Install once, then open the app"
        description="The command line handles setup and health checks. The day-to-day experience is the local dashboard."
        layout="bg"
        visual={
          <div className="absolute inset-x-5 top-5 h-[200px] overflow-hidden">
            <Terminal className="!h-full !max-w-full !rounded-lg !text-[0.72rem]">
              <TypingAnimation duration={45}>$ slashcash sync</TypingAnimation>
              <AnimatedSpan className="text-emerald-600">
                <span>✓ Gmail connected</span>
              </AnimatedSpan>
              <AnimatedSpan className="text-neutral-500">
                <span>→ Finding Swiggy receipts</span>
              </AnimatedSpan>
              <AnimatedSpan className="text-amber-600">
                <span>→ Reading receipt details</span>
              </AnimatedSpan>
              <AnimatedSpan className="text-sky-700">
                <span>✓ Dashboard ready</span>
              </AnimatedSpan>
            </Terminal>
          </div>
        }
      />

      {/* CELL E — Connect any source */}
      <BentoCell
        className="md:col-span-1 min-h-[380px]"
        eyebrow="Honest scope"
        title="Focused on Swiggy first"
        description="The product does one useful thing today and does it carefully. More receipt sources can be added without changing the privacy model."
        layout="stack"
        visual={
          <div className="relative h-full w-full p-6">
            <div className="grid grid-cols-3 gap-2 text-[0.7rem] font-medium text-neutral-600">
              {[
                "Gmail",
                "Swiggy",
                "Receipts",
                "Trends",
                "Fees",
                "Private",
                "Open",
                "Local",
                "Setup",
                "Health",
                "Source",
                "Export",
              ].map((src) => (
                <span
                  key={src}
                  className="inline-flex items-center justify-center rounded-full border border-black/5 bg-white py-1.5 shadow-sm transition group-hover:-translate-y-px"
                >
                  {src}
                </span>
              ))}
            </div>
            <Plug className="pointer-events-none absolute right-4 top-4 h-6 w-6 text-sky-300" />
          </div>
        }
      />
    </div>
  );
}

export function BentoFeaturesSecondary() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
      <BentoCell
        className="md:col-span-2 min-h-[280px]"
        eyebrow="Open-source"
        title="You can inspect how it works"
        description="The source is public. Privacy is not just a promise on the homepage; the important parts can be checked in code."
        layout="split"
        visual={
          <div className="relative h-full w-full">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 30% 40%, rgba(47,108,235,0.14), transparent 55%)",
              }}
            />
            <div className="absolute inset-0 grid place-items-center p-6">
              <code className="rounded-2xl border border-black/5 bg-white px-5 py-4 text-[0.78rem] font-mono leading-relaxed text-neutral-700 shadow-[0_12px_32px_-12px_rgba(47,108,235,0.15)]">
                <span className="text-neutral-400">$</span>{" "}
                <span className="text-sky-700">npm i -g</span> slashcash
                <br />
                <span className="text-neutral-400">$</span>{" "}
                <span className="text-sky-700">slashcash</span> onboard
                <br />
                <span className="text-neutral-400">$</span>{" "}
                <span className="text-sky-700">slashcash</span> start
              </code>
            </div>
          </div>
        }
      />

      <BentoCell
        className="md:col-span-1 min-h-[280px]"
        eyebrow="Privacy"
        title="Read-only · approval-based"
        description="slash.cash reads receipts. It cannot move money, send emails, or change your inbox."
        layout="bg"
        visual={
          <div className="flex h-full flex-col items-center justify-start pt-10">
            <div
              className="grid h-24 w-24 place-items-center rounded-3xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(47,108,235,0.15))",
              }}
            >
              <ShieldCheck
                className="h-10 w-10 text-emerald-600"
                strokeWidth={1.5}
              />
            </div>
          </div>
        }
      />
    </div>
  );
}

export function PipelineBento() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
      <BentoCell
        className="md:col-span-2 min-h-[440px]"
        eyebrow="How it works"
        title="A few clear steps, not a black box."
        description="Find receipts, read the useful details, save them locally, and show the dashboard. Optional chat comes later if you want it."
        layout="split"
        visual={
          <div className="relative h-full w-full">
            <PipelineOrbit />
          </div>
        }
      />

      <BentoCell
        className="md:col-span-1 min-h-[440px]"
        eyebrow="Refresh"
        title="Update when you want"
        description="Run sync when you want the latest receipts, or let the local app check in the background while it is open."
        layout="bg"
        visual={
          <div className="flex h-full flex-col items-center justify-start pt-10">
            <div className="relative grid h-32 w-32 place-items-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 90deg, #635bff, #2f6ceb, #0ea5e9, #14b8a6, #635bff)",
                  filter: "blur(14px)",
                  opacity: 0.5,
                }}
              />
              <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white shadow-[0_12px_32px_-8px_rgba(47,108,235,0.28)]">
                <ScanSearch
                  className="h-8 w-8 text-[#635bff]"
                  strokeWidth={1.5}
                />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
