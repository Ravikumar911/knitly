"use client";

import { motion } from "motion/react";
import { Database, Eye, FileSearch, Lock } from "lucide-react";

const pillars = [
  {
    icon: Lock,
    iconClass: "h-5 w-5 text-[#635bff]",
    headline: "No cloud copy",
    body: "Your spending history stays on your machine. We do not run a hosted copy of your dashboard.",
    tint: "linear-gradient(135deg, #635bff, #2f6ceb)",
  },
  {
    icon: Database,
    iconClass: "h-5 w-5 text-[#2f6ceb]",
    headline: "You can leave anytime",
    body: "The data is stored locally. Back it up, move it, or delete it whenever you want.",
    tint: "linear-gradient(135deg, #2f6ceb, #0ea5e9)",
  },
  {
    icon: Eye,
    iconClass: "h-5 w-5 text-[#0ea5e9]",
    headline: "Read-only by design",
    body: "slash.cash reads receipts. It cannot move money, send mail, or change your bank.",
    tint: "linear-gradient(135deg, #0ea5e9, #14b8a6)",
  },
  {
    icon: FileSearch,
    iconClass: "h-5 w-5 text-[#14b8a6]",
    headline: "Open to inspect",
    body: "The core is open source, so the privacy story does not depend on vague promises.",
    tint: "linear-gradient(135deg, #14b8a6, #635bff)",
  },
];

export function PrinciplesBand() {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-black/5 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_64px_-32px_rgba(47,108,235,0.18)] md:p-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, rgba(99,91,255,0.07), transparent 50%), radial-gradient(circle at 100% 100%, rgba(20,184,166,0.08), transparent 50%)",
        }}
      />
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p, i) => (
          <motion.div
            key={p.headline}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="flex flex-col gap-3"
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl border border-black/5 bg-white shadow-[0_4px_16px_-4px_rgba(47,108,235,0.12)]"
              aria-hidden="true"
            >
              <p.icon className={p.iconClass} strokeWidth={1.75} />
            </span>
            <h3
              className="text-[1.05rem] font-bold leading-snug tracking-tight md:text-[1.15rem]"
              style={{
                backgroundImage: p.tint,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {p.headline}
            </h3>
            <p className="text-[0.88rem] leading-relaxed text-neutral-600">
              {p.body}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
