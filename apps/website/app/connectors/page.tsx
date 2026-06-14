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
  title: "Receipt sources",
  description:
    "Slash Cash reads Swiggy receipts from Gmail today and turns them into a private spending dashboard on your laptop.",
};

const connectors: {
  name: string;
  state: "Available" | "Bundled" | "Authorable";
}[] = [
  { name: "Gmail receipt access", state: "Available" },
  { name: "Swiggy order emails", state: "Bundled" },
  { name: "Swiggy invoice attachments", state: "Bundled" },
  { name: "Receipt details from email text", state: "Bundled" },
  {
    name: "More receipt sources",
    state: "Authorable",
  },
];

const stateStyle: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-700",
  Bundled: "bg-gradient-to-r from-sky-100 via-blue-50 to-teal-100 text-sky-900",
  Authorable: "bg-neutral-100 text-neutral-500",
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
              Receipt sources
            </span>
          </BlurFade>

          <BlurFade delay={0.12} inView>
            <h1 className="mt-5 max-w-3xl text-[2.6rem] font-bold leading-[1.05] tracking-tight md:text-[3.2rem]">
              Your receipts already live in email.
              <br />
              <AuroraText colors={["#635bff", "#2f6ceb", "#0ea5e9", "#14b8a6"]}>
                slash.cash turns them into a dashboard.
              </AuroraText>
            </h1>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-neutral-500 md:text-[1.12rem]">
              Start with Swiggy receipts from Gmail. slash.cash reads the order
              details on your laptop and shows what you spent, where, and when.
            </p>
          </BlurFade>

          <BlurFade delay={0.28} inView>
            <div className="mt-7">
              <InstallCta showCommand />
            </div>
          </BlurFade>
        </div>
      </section>

      <Section eyebrow="Privacy" title="Simple guarantees." align="center">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Inbox className="h-5 w-5 text-indigo-500" />,
              title: "Read-only access",
              body: "slash.cash reads matching receipt emails. It cannot send, archive, or modify your inbox.",
            },
            {
              icon: <Sparkles className="h-5 w-5 text-sky-600" />,
              title: "Predictable receipt reading",
              body: "The same receipt should produce the same result every time. If something is wrong, the open-source code can be fixed.",
            },
            {
              icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
              title: "Stays on your device",
              body: "Receipts are read locally. There is no Slash Cash-hosted copy of your spending dashboard.",
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
        eyebrow="Available now"
        title={
          <>
            Receipt sources slash.cash recognizes{" "}
            <AuroraText colors={["#635bff", "#2f6ceb"]}>today.</AuroraText>
          </>
        }
        description="The current product starts focused and honest: Swiggy receipts from Gmail today, with more local sources possible later."
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
            "Import Swiggy receipts",
            "Read invoices and email text locally",
            "Review monthly food-delivery spend",
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
          Want a receipt source that is not here yet?{" "}
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
