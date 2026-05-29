import type { Metadata } from "next";
import { CheckCircle2, Inbox, Mail, ShieldCheck, Sparkles } from "lucide-react";

import { AuroraText } from "@workspace/ui/components/aurora-text";
import { BlurFade } from "@workspace/ui/components/magicui/blur-fade";
import { DotPattern } from "@workspace/ui/components/magicui/dot-pattern";
import { cn } from "@workspace/ui/lib/utils";

import { InstallCta } from "@/components/marketing/install-cta";
import { Section } from "@/components/marketing/section";
import { GITHUB_URL } from "@/lib/links";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Email connectors",
  description:
    "Slash Cash imports financial activity from email — UPI receipts, card statements, food delivery, subscriptions — on your laptop via read-only IMAP. No cloud ledger.",
};

const connectors: { name: string; state: "Stable" | "Featured" | "Beta" }[] = [
  { name: "Bank statements (HDFC, ICICI, SBI, Axis, Kotak…)", state: "Stable" },
  { name: "Credit cards (Amex, Axis, HDFC, ICICI…)", state: "Stable" },
  { name: "UPI (PhonePe, GPay, Paytm, BHIM)", state: "Stable" },
  {
    name: "Subscriptions (Netflix, Spotify, iCloud, JioSaavn)",
    state: "Stable",
  },
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
                style={{
                  background:
                    "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-4))",
                }}
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
              The Connector Agent uses IMAP with a user-generated Gmail app
              password to scan finance-related messages — bank, card, UPI,
              subscription, food delivery — and turns them into structured
              transactions in local SQLite. Nothing is uploaded to Slash Cash
              servers.
            </p>
          </BlurFade>

          <BlurFade delay={0.28} inView>
            <div className="mt-7">
              <InstallCta showCommand />
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
              body: "Use your provider's app-password feature. Slash Cash only reads finance-related threads. It cannot send, archive, or modify your inbox.",
            },
            {
              icon: <Sparkles className="h-5 w-5 text-sky-600" />,
              title: "Deterministic extractors",
              body: "Per-source extractors with snapshot tests. The same Swiggy receipt yields the same transaction every time — auditable, versionable, open-source.",
            },
            {
              icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
              title: "Stays on your device",
              body: "Email bodies are parsed locally. Only structured transactions land in your SQLite file. No Slash Cash–hosted copy of your finances.",
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
          Want a connector that is not here yet?{" "}
          <a
            href={`${GITHUB_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-800 underline-offset-2 hover:underline"
          >
            Open an issue on GitHub →
          </a>
        </div>
      </Section>
    </div>
  );
}
