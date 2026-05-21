"use client";

import { motion } from "motion/react";
import { Database, Eye, FileSearch, Lock } from "lucide-react";

const pillars = [
  {
    icon: Lock,
    iconClass: "h-5 w-5 text-[#635bff]",
    headline: "Zero cloud ledger",
    body: "Transactions live in SQLite on your machine. We do not operate a hosted copy of your money graph.",
    tint: "linear-gradient(135deg, #635bff, #2f6ceb)",
  },
  {
    icon: Database,
    iconClass: "h-5 w-5 text-[#2f6ceb]",
    headline: "You own the file",
    body: "Back it up, diff it, delete it. The database path is yours — the same contract as git for code.",
    tint: "linear-gradient(135deg, #2f6ceb, #0ea5e9)",
  },
  {
    icon: Eye,
    iconClass: "h-5 w-5 text-[#0ea5e9]",
    headline: "Read-only by design",
    body: "Connectors ingest what you approve. Slash Cash cannot move money, send mail, or change your bank.",
    tint: "linear-gradient(135deg, #0ea5e9, #14b8a6)",
  },
  {
    icon: FileSearch,
    iconClass: "h-5 w-5 text-[#14b8a6]",
    headline: "Inspectable agents",
    body: "Seven small programs with one job each — not a black-box “finance AI.” The core is open source on GitHub.",
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
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
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
