"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";

import { NPM_URL } from "@/lib/links";

const links = [
  { href: "/#why", label: "Why us" },
  { href: "/#features", label: "Features" },
  { href: "/#demo", label: "Demo" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
  { href: "/connectors", label: "Connectors" },
];

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-neutral-700 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(100vw-2rem,320px)]">
        <SheetHeader>
          <SheetTitle className="text-left text-base">slash.cash</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2.5 text-[0.95rem] font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <a
          href={NPM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full text-[0.9rem] font-semibold text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
          }}
        >
          Install free
        </a>
      </SheetContent>
    </Sheet>
  );
}
