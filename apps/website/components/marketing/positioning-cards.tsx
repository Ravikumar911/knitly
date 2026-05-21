import { Landmark, Shield, Sparkles } from "lucide-react";

const cards = [
  {
    icon: Shield,
    title: "Versus cloud finance apps",
    body: "Most PFMs monetize attention, ads, or upsells on your data. Slash Cash is local-first: the business model can align with power users because the sensitive graph never sits on our servers.",
  },
  {
    icon: Landmark,
    title: "Built for India-shaped money",
    body: "UPI-first flows, rupee-native summaries, and deterministic ingestion for real Indian spend patterns (for example order-email extractors) — not a US credit-score app painted blue.",
  },
  {
    icon: Sparkles,
    title: "Versus “one giant model”",
    body: "Seven small agents with narrow jobs are easier to audit, replay, and improve than a single chatbot that guesses your entire financial life in one prompt.",
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
