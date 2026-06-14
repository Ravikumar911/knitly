import { Cloud, FileSpreadsheet, KeyRound } from "lucide-react";

const cards = [
  {
    icon: Cloud,
    title: "Money data is too personal",
    body: "Many finance apps ask for broad access before they show anything useful. slash.cash starts with receipts and keeps the dashboard on your laptop.",
  },
  {
    icon: FileSpreadsheet,
    title: "Spreadsheets do not stay current",
    body: "Manual tracking works for a week, then receipts pile up. slash.cash handles the boring import step so you can review instead of clean up.",
  },
  {
    icon: KeyRound,
    title: "No new finance account",
    body: "There is no Slash Cash cloud login for your spending history. You install it, connect receipts, and keep control of the data.",
  },
];

export function PositioningCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.title}
          className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(47,108,235,0.1)]"
        >
          <span
            className="grid h-10 w-10 place-items-center rounded-xl border border-black/5 bg-neutral-50"
            aria-hidden="true"
          >
            <c.icon className="h-5 w-5 text-[#2f6ceb]" strokeWidth={1.5} />
          </span>
          <div>
            <h3 className="text-[1.05rem] font-semibold tracking-tight text-neutral-900">
              {c.title}
            </h3>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-neutral-600">
              {c.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
