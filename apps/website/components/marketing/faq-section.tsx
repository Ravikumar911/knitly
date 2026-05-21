"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";

const items = [
  {
    q: "Does Slash Cash upload my bank data to your cloud?",
    a: "No. The ledger lives in SQLite on your machine (by default under your home directory). Sync and agents run locally. There is no Slash Cash–hosted copy of your transactions to sell or leak.",
  },
  {
    q: "How does Gmail import work?",
    a: "Gmail is accessed over standard IMAP using a 16-character app password you generate in your Google account — the same pattern many mail clients use. Credentials stay on your device (for example macOS Keychain or a local credentials file when Keychain is unavailable).",
  },
  {
    q: "Can Slash Cash move money, pay bills, or send email on my behalf?",
    a: "No. Connectors are read-only by design. The product ingests and analyzes; it cannot execute payments, trades, or outbound messages.",
  },
  {
    q: "Do I need an AI subscription to use it?",
    a: "No. Ingestion and categorization work without any model. Optional assistant features use providers you configure later — useful, but not a gate to getting a clear local dashboard.",
  },
  {
    q: "What do I actually install today?",
    a: "The open-source `slashcash` CLI (`npm i -g slashcash`), then `slashcash onboard` and `slashcash start` for the local dashboard. A fully hosted SaaS dashboard is on the roadmap; the engine you can try now is the same one we ship in the repo.",
  },
];

export function FaqSection() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item, i) => (
        <AccordionItem key={item.q} value={`item-${i}`}>
          <AccordionTrigger className="text-left text-[0.95rem] font-semibold text-neutral-900 hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-[0.9rem] leading-relaxed text-neutral-600">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
