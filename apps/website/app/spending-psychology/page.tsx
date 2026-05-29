import type { Metadata } from "next";
import { Brain, CreditCard, PiggyBank, Repeat, TrendingUp } from "lucide-react";

import { AuroraText } from "@workspace/ui/components/aurora-text";
import { BlurFade } from "@workspace/ui/components/magicui/blur-fade";
import { DotPattern } from "@workspace/ui/components/magicui/dot-pattern";
import { cn } from "@workspace/ui/lib/utils";

import { InstallCta } from "@/components/marketing/install-cta";
import { Section } from "@/components/marketing/section";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Spending psychology",
  description:
    "Why we overspend, why dashboards don't help, and how Slash Cash's local agents turn money behavior into one clear weekly action.",
};

const biases = [
  {
    icon: <Brain className="h-5 w-5 text-indigo-600" />,
    title: "Mental accounting",
    body: "We treat ₹500 on food delivery as “lifestyle” and ₹500 of subscriptions as “invisible.” Slash Cash collapses every category into the same lens — money out, behavior pattern.",
  },
  {
    icon: <Repeat className="h-5 w-5 text-sky-600" />,
    title: "The compounding leak",
    body: "Three forgotten subscriptions cost more than a missed SIP step-up. The Leak Agent surfaces these every Monday so you fix them before they recur.",
  },
  {
    icon: <CreditCard className="h-5 w-5 text-teal-500" />,
    title: "Friction asymmetry",
    body: "Spending is one tap. Reviewing is a workflow. Slash Cash inverts that — review is automatic, intervention is opt-in, the dashboard is ready before you open it.",
  },
  {
    icon: <PiggyBank className="h-5 w-5 text-emerald-500" />,
    title: "Behavior, not credit",
    body: "Credit scores reward debt. Money health rewards savings rate, low recurring load, investment consistency, and emergency cover.",
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-[#2f6ceb]" />,
    title: "Decisions, not charts",
    body: "Charts narrate the past. Agents make a recommendation: cut ₹X here, move ₹Y to SIP, cancel these three subscriptions. One action a week beats ten dashboards.",
  },
];

export default function SpendingPsychologyPage() {
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
              Essay
            </span>
          </BlurFade>

          <BlurFade delay={0.12} inView>
            <h1 className="mt-5 max-w-3xl text-[2.6rem] font-bold leading-[1.05] tracking-tight md:text-[3.2rem]">
              Why we overspend —{" "}
              <AuroraText colors={["#635bff", "#2f6ceb", "#0ea5e9"]}>
                and what an honest finance agent does about it.
              </AuroraText>
            </h1>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-neutral-500 md:text-[1.12rem]">
              A short read on the loops most finance apps reinforce, and how
              Slash Cash is built around what actually changes behavior.
            </p>
          </BlurFade>
        </div>
      </section>

      <Section
        eyebrow="Five biases"
        title="The patterns we've been designing around."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {biases.map((b) => (
            <div
              key={b.title}
              className="slash-bento-card flex flex-col gap-3 p-6"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-50 ring-1 ring-black/5">
                {b.icon}
              </span>
              <h3 className="text-[1.1rem] font-semibold tracking-tight text-neutral-900">
                {b.title}
              </h3>
              <p className="text-[0.92rem] leading-relaxed text-neutral-500">
                {b.body}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-12 rounded-2xl p-8 md:p-10"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,91,255,0.06), rgba(20,184,166,0.07))",
            border: "1px solid rgba(47,108,235,0.14)",
          }}
        >
          <p className="text-center text-[1.05rem] leading-relaxed text-neutral-700 md:text-[1.15rem]">
            The point of Slash Cash is not to make you feel guilty about a
            coffee. It is to put{" "}
            <span className="font-semibold text-neutral-900">
              one clear, well-explained action
            </span>{" "}
            in front of you each week — on your machine, without a hosted
            ledger.
          </p>
          <div className="mt-8 flex justify-center">
            <InstallCta />
          </div>
        </div>
      </Section>
    </div>
  );
}
