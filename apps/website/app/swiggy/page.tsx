import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Inbox, Mail, ShieldCheck, Sparkles } from "lucide-react";

import { AuroraText } from "@workspace/ui/components/aurora-text";
import { BlurFade } from "@workspace/ui/components/magicui/blur-fade";
import { DotPattern } from "@workspace/ui/components/magicui/dot-pattern";
import { cn } from "@workspace/ui/lib/utils";

import { Section } from "@/components/marketing/section";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Email connectors",
  description:
    "Slash Cash imports your financial activity from email — UPI receipts, card statements, food delivery, subscriptions — without uploading anything to a cloud. Swiggy is one of dozens of sources the Connector Agent recognizes.",
};

const connectors: { name: string; state: "Stable" | "Featured" | "Beta" }[] = [
  { name: "Bank statements (HDFC, ICICI, SBI, Axis, Kotak…)", state: "Stable" },
  { name: "Credit cards (Amex, Axis, HDFC, ICICI…)", state: "Stable" },
  { name: "UPI (PhonePe, GPay, Paytm, BHIM)", state: "Stable" },
  { name: "Subscriptions (Netflix, Spotify, iCloud, JioSaavn)", state: "Stable" },
  { name: "Food delivery — Swiggy", state: "Featured" },
  { name: "Food delivery — Zomato", state: "Beta" },
  { name: "E-commerce (Amazon, Flipkart, Myntra, Meesho)", state: "Beta" },
  { name: "Travel (Uber, Ola, IRCTC, MakeMyTrip)", state: "Beta" },
  { name: "Bills (electricity, telecom, broadband)", state: "Beta" },
];

const stateStyle: Record<string, string> = {
  Stable: "bg-emerald-50 text-emerald-700",
  Featured:
    "bg-gradient-to-r from-sky-100 via-blue-50 to-teal-100 text-sky-900",
  Beta: "bg-neutral-100 text-neutral-500",
};

export default function ConnectorsPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <DotPattern
          className={cn(
            "[mask-image:radial-gradient(700px_circle_at_top_right,white,transparent)]",
            "fill-sky-300/35",
          )}
          width={28}
          height={28}
          cr={1}
          aria-hidden="true"
        />
        <div className="slash-halo" aria-hidden="true" />

        <div className="mx-auto max-w-[1180px] px-6 pb-12 pt-32 md:pt-40 md:pb-20">
          <BlurFade delay={0.05} inView>
            <span className="slash-eyebrow">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-4))" }}
              />
              Connectors
            </span>
          </BlurFade>

          <BlurFade delay={0.12} inView>
            <h1 className="mt-5 max-w-3xl text-[2.6rem] font-bold leading-[1.05] tracking-tight md:text-[3.2rem]">
              Your financial life lives in email.
              <br />
              <AuroraText colors={["#635bff", "#2f6ceb", "#0ea5e9", "#14b8a6"]}>
                Slash Cash reads it on your laptop.
              </AuroraText>
            </h1>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-neutral-500 md:text-[1.12rem]">
              The Connector Agent uses IMAP + a user-generated app password to
              scan only finance-related messages — bank, card, UPI, subscription,
              food delivery — and turns them into structured transactions.
              Nothing is uploaded.
            </p>
          </BlurFade>

          <BlurFade delay={0.28} inView>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="https://github.com/slashcash"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-[0.92rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                View source
              </a>
              <span className="inline-flex h-11 items-center rounded-full border border-dashed border-black/15 bg-white/70 px-5 text-[0.92rem] font-medium text-neutral-500">
                Dashboard · coming soon
              </span>
            </div>
          </BlurFade>
        </div>
      </section>

      <Section
        eyebrow="How it stays private"
        title="Three guarantees, baked in."
        align="center"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Inbox className="h-5 w-5 text-indigo-500" />,
              title: "Read-only IMAP",
              body: "Use your provider's app-password feature. Slash Cash only reads labelled finance threads. It can't send, archive, or modify your inbox.",
            },
            {
              icon: <Sparkles className="h-5 w-5 text-sky-600" />,
              title: "Deterministic extractors",
              body: "Per-source extractors with snapshot tests. The same Swiggy receipt yields the same transaction every time — auditable, versionable, open-source.",
            },
            {
              icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
              title: "Stays on your device",
              body: "Email bodies are parsed locally and dropped. Only structured transactions land in your local SQLite. No cloud sync of your finances.",
            },
          ].map((it) => (
            <div
              key={it.title}
              className="slash-bento-card flex flex-col gap-3 p-6"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-50 ring-1 ring-black/5">
                {it.icon}
              </span>
              <h3 className="text-[1.05rem] font-semibold tracking-tight text-neutral-900">
                {it.title}
              </h3>
              <p className="text-[0.9rem] leading-relaxed text-neutral-500">
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="What we read"
        title={
          <>
            Sources Slash Cash recognizes{" "}
            <AuroraText colors={["#635bff", "#2f6ceb"]}>today.</AuroraText>
          </>
        }
        description="Connectors graduate from Beta to Stable when deterministic snapshot tests cover real-world variants. Add your own — the extractor pattern is open."
      >
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_64px_-32px_rgba(47,108,235,0.14)]">
          {connectors.map((c, idx) => (
            <div
              key={c.name}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4",
                idx > 0 && "border-t border-black/5",
              )}
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
                <Mail className="h-4 w-4 text-[#635bff]" />
              </span>
              <span className="text-[0.95rem] font-medium text-neutral-800">
                {c.name}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em]",
                  stateStyle[c.state],
                )}
              >
                {c.state}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3 text-[0.9rem]">
          {[
            "Find your three biggest leaks",
            "See what changed vs last month",
            "Get one suggested action this week",
          ].map((item) => (
            <div
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-neutral-700">{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center text-[0.95rem] text-neutral-500">
          Want a connector that isn't here yet?{" "}
          <Link
            href="/"
            className="font-semibold text-sky-800 underline-offset-2 hover:underline"
          >
            Open an issue on GitHub →
          </Link>
        </div>
      </Section>
    </div>
  );
}
