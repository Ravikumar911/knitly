"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";

import { ShineBorder } from "@workspace/ui/components/shine-border";
import { cn } from "@workspace/ui/lib/utils";

interface PricingTier {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  badge?: string;
}

const tiers: PricingTier[] = [
  {
    name: "Free",
    price: "₹0",
    description: "The whole open-source engine. For everyone.",
    features: [
      "All 7 agents on your laptop",
      "IMAP + UPI + cards connectors",
      "Score, leaks, weekly review",
      "Local SQLite database",
      "Community support",
    ],
    cta: "Get the CLI",
    href: "https://github.com/slashcash",
  },
  {
    name: "Pro",
    price: "₹399",
    cadence: "/ month",
    description: "Advanced workflows + premium connectors.",
    badge: "Most popular",
    highlighted: true,
    features: [
      "Everything in Free",
      "Investor Agent · advanced planning",
      "Premium connectors (more sources)",
      "Encrypted backup",
      "Mobile companion",
      "Priority email support",
    ],
    cta: "Start 14-day trial",
    href: "https://app.slash.cash",
  },
  {
    name: "Family",
    price: "₹899",
    cadence: "/ month",
    description: "Multi-member household. Shared review loop.",
    features: [
      "Everything in Pro",
      "Up to 4 members",
      "Shared review timeline",
      "Household goals",
      "Combined money health score",
    ],
    cta: "Start a household",
    href: "https://app.slash.cash",
  },
  {
    name: "Advisor",
    price: "Custom",
    description: "For CAs, planners, family offices.",
    features: [
      "Everything in Family",
      "Multi-client workspaces",
      "Advisor-ready PDF reports",
      "Audit trail per client",
      "B2B onboarding",
    ],
    cta: "Talk to us",
    href: "mailto:hi@slash.cash",
  },
];

export function PricingTiers() {
  return (
    <div className="grid w-full gap-4 md:grid-cols-2 lg:grid-cols-4">
      {tiers.map((t) => (
        <PricingCard key={t.name} tier={t} />
      ))}
    </div>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden rounded-2xl border bg-white p-6",
        tier.highlighted
          ? "border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-16px_rgba(168,85,247,0.3)]"
          : "border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.05)]",
      )}
    >
      {tier.highlighted && (
        <ShineBorder
          shineColor={["#6366f1", "#a855f7", "#ec4899"]}
          duration={10}
          borderWidth={2}
        />
      )}

      {tier.badge && (
        <span
          className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white"
          style={{
            background:
              "linear-gradient(135deg, #6366f1, #a855f7 50%, #ec4899)",
          }}
        >
          <Sparkles className="h-3 w-3" /> {tier.badge}
        </span>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-neutral-900">
          {tier.name}
        </h3>
        <p className="text-[0.82rem] leading-relaxed text-neutral-500">
          {tier.description}
        </p>
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-[2.4rem] font-bold leading-none tabular-nums tracking-tight",
            tier.highlighted ? "" : "text-neutral-900",
          )}
          style={
            tier.highlighted
              ? {
                  backgroundImage:
                    "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }
              : undefined
          }
        >
          {tier.price}
        </span>
        {tier.cadence && (
          <span className="text-[0.85rem] font-medium text-neutral-400">
            {tier.cadence}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-2.5">
        {tier.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-[0.86rem] text-neutral-700">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 flex-none",
                tier.highlighted ? "text-fuchsia-500" : "text-emerald-500",
              )}
              strokeWidth={2.5}
            />
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      <a
        href={tier.href}
        target={tier.href.startsWith("http") ? "_blank" : undefined}
        rel={tier.href.startsWith("http") ? "noopener noreferrer" : undefined}
        className={cn(
          "mt-auto inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[0.85rem] font-semibold transition",
          tier.highlighted
            ? "text-white shadow-[0_8px_24px_-8px_rgba(168,85,247,0.5)]"
            : "border border-black/5 bg-white text-neutral-700 hover:bg-neutral-50",
        )}
        style={
          tier.highlighted
            ? {
                background:
                  "linear-gradient(135deg, #6366f1, #a855f7 50%, #ec4899)",
              }
            : undefined
        }
      >
        {tier.cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
