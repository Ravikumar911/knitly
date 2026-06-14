"use client";

import { motion } from "motion/react";
import {
  Activity,
  CheckCircle2,
  Lock,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export function HeroPreviewCard() {
  return (
    <div className="relative w-full max-w-[440px]">
      {/* Soft gradient halo behind the card */}
      <div
        className="pointer-events-none absolute -inset-12 -z-10 opacity-90"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 70% 30%, rgba(47,108,235,0.2), transparent 55%), radial-gradient(circle at 25% 80%, rgba(99,91,255,0.15), transparent 55%), radial-gradient(circle at 80% 90%, rgba(20,184,166,0.14), transparent 55%)",
          filter: "blur(8px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_30px_80px_-20px_rgba(47,108,235,0.2)]"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-black/5 bg-neutral-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-auto font-mono text-[0.66rem] font-medium tracking-wider text-neutral-400">
            slash.cash · local
          </span>
        </div>

        <div className="flex flex-col gap-4 p-5 pb-6">
          {/* Live indicator */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="slash-pulse flex-none">
                <span className="block h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="truncate text-[0.78rem] font-medium text-neutral-700">
                <Activity
                  className="mr-1 inline h-3 w-3 -translate-y-px"
                  aria-hidden="true"
                />
                Receipts imported
              </span>
            </div>
            <span className="flex-none rounded-full bg-sky-50 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-sky-800">
              Live
            </span>
          </div>

          {/* Pipeline rows */}
          <div className="flex flex-col gap-1.5">
            {[
              { name: "Receipt emails found", meta: "1 year" },
              { name: "Amounts and fees read", meta: "done" },
              { name: "Dashboard updated", meta: "private" },
            ].map((a, idx) => (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.25 + idx * 0.12 }}
                className="flex items-center gap-2.5 rounded-xl border border-black/5 bg-neutral-50/80 px-3 py-2.5"
              >
                <CheckCircle2 className="h-4 w-4 flex-none text-emerald-500" />
                <span className="flex-1 text-[0.85rem] font-semibold tracking-tight text-neutral-900">
                  {a.name}
                </span>
                <span className="font-mono text-[0.7rem] font-medium text-neutral-500">
                  {a.meta}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Score block */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="relative overflow-hidden rounded-2xl border border-sky-200/55 p-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,91,255,0.06), rgba(47,108,235,0.045) 60%, rgba(20,184,166,0.06))",
            }}
          >
            <div className="flex items-center justify-between text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              <span>Swiggy spend this month</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.55rem] font-semibold text-emerald-700">
                <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" /> 42
                receipts
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className="font-sans text-[2.6rem] font-bold leading-none tabular-nums"
                style={{ letterSpacing: "0" }}
              >
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #635bff, #2f6ceb, #0ea5e9)",
                  }}
                >
                  ₹12.8K
                </span>
              </span>
              <span className="text-[0.85rem] font-medium text-neutral-400">
                private
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-100">
              <motion.span
                className="block h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, #635bff, #2f6ceb, #0ea5e9)",
                }}
                initial={{ width: 0 }}
                animate={{ width: "68%" }}
                transition={{ duration: 1, delay: 0.85, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[0.74rem] text-neutral-600">
              <Sparkles className="h-3 w-3 text-sky-600" aria-hidden="true" />
              <span>
                Ready:{" "}
                <span className="font-semibold text-neutral-900">
                  restaurants, fees, and trends
                </span>
              </span>
            </div>
          </motion.div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-dashed border-black/10 pt-3 text-[0.66rem] font-medium text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-500" aria-hidden="true" />
              Your numbers stay on this laptop
            </span>
            <span className="font-mono uppercase tracking-wider">
              v0.1 · local
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
