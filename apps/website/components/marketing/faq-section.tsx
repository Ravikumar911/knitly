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
    a: "No. The dashboard data lives on your machine. There is no Slash Cash cloud account holding your spending history.",
  },
  {
    q: "How does it read Gmail receipts?",
    a: "You generate a Gmail app password and paste it during setup. That password stays on your device, and slash.cash uses it to read matching receipt emails.",
  },
  {
    q: "Can Slash Cash move money, pay bills, or send email on my behalf?",
    a: "No. It only reads receipt data. It cannot execute payments, trades, or outbound messages.",
  },
  {
    q: "Do I need an AI subscription?",
    a: "No. Receipt import works without an AI subscription. The assistant is optional and can be configured later.",
  },
  {
    q: "What can I try today?",
    a: "Download slash.cash for Mac (Apple Silicon), open the app, and complete onboarding. Today it is focused on Swiggy receipts from Gmail. If macOS Gatekeeper blocks the first open, right-click the app and choose Open.",
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
