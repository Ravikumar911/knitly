"use client";

import { motion } from "motion/react";

import { NumberTicker } from "@workspace/ui/components/magicui/number-ticker";

interface Stat {
  label: string;
  suffix?: string;
  prefix?: string;
  value: number;
  valueLabel?: string;
  tint: string;
}

const stats: Stat[] = [
  {
    label: "transactions classified",
    suffix: "M+",
    value: 12,
    tint: "linear-gradient(135deg, #6366f1, #a855f7)",
  },
  {
    label: "in unused subs flagged",
    prefix: "₹",
    suffix: "K+",
    value: 480,
    tint: "linear-gradient(135deg, #a855f7, #ec4899)",
  },
  {
    label: "average score lift / 90 days",
    prefix: "+",
    suffix: " pts",
    value: 11,
    tint: "linear-gradient(135deg, #ec4899, #f97316)",
  },
  {
    label: "data uploaded to our cloud",
    suffix: "",
    value: 0,
    valueLabel: "0",
    tint: "linear-gradient(135deg, #06b6d4, #6366f1)",
  },
];

export function StatsBand() {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-black/5 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_64px_-32px_rgba(99,102,241,0.25)] md:p-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, rgba(99,102,241,0.08), transparent 50%), radial-gradient(circle at 100% 100%, rgba(236,72,153,0.08), transparent 50%)",
        }}
      />
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="flex flex-col gap-1.5"
          >
            <div className="flex items-baseline gap-0.5 text-[2.4rem] font-bold leading-none tabular-nums tracking-tight md:text-[3rem]">
              {s.prefix && (
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: s.tint }}
                >
                  {s.prefix}
                </span>
              )}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: s.tint }}
              >
                {s.valueLabel ? (
                  s.valueLabel
                ) : (
                  <NumberTicker
                    value={s.value}
                    className="!text-transparent"
                  />
                )}
              </span>
              {s.suffix && (
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: s.tint }}
                >
                  {s.suffix}
                </span>
              )}
            </div>
            <span className="text-[0.78rem] font-medium uppercase tracking-[0.12em] text-neutral-500">
              {s.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
