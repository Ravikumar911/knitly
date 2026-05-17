"use client";

import { Marquee } from "@workspace/ui/components/marquee";
import { cn } from "@workspace/ui/lib/utils";

interface Review {
  name: string;
  username: string;
  body: string;
  initials: string;
  tint: string;
}

const reviews: Review[] = [
  {
    name: "Aarav Sharma",
    username: "@aarav.dev",
    body: "Finally, money tracking that doesn't ask me to upload my bank statements to a random cloud. Slash Cash runs entirely on my MacBook.",
    initials: "AS",
    tint: "from-violet-200 to-fuchsia-200",
  },
  {
    name: "Meena Iyer",
    username: "@meena_iyer",
    body: "The Leak Agent caught ₹4,800/yr of subscriptions I'd genuinely forgotten. That alone paid for the Pro license.",
    initials: "MI",
    tint: "from-cyan-200 to-violet-200",
  },
  {
    name: "Rahul Reddy",
    username: "@rdy.dev",
    body: "Half the apps I used before were just charts. Slash Cash actually tells me what to do this week. Game changer.",
    initials: "RR",
    tint: "from-amber-200 to-rose-200",
  },
  {
    name: "Priya Nair",
    username: "@priyacodes",
    body: "Open-source CLI + a beautiful local dashboard. This is what privacy-respecting fintech should look like.",
    initials: "PN",
    tint: "from-emerald-200 to-cyan-200",
  },
  {
    name: "Karthik Menon",
    username: "@kmenon",
    body: "The score went from 58 to 71 in two months. Following the agents' weekly nudge actually compounds.",
    initials: "KM",
    tint: "from-rose-200 to-amber-200",
  },
  {
    name: "Sneha Joshi",
    username: "@snehaj",
    body: "I love that I can `git diff` my own finance rules. No black box. No “trust us”. Just code I can read.",
    initials: "SJ",
    tint: "from-fuchsia-200 to-violet-200",
  },
  {
    name: "Tanay Gupta",
    username: "@tanaygupta",
    body: "Switched from a popular tracker. The auto-categorization on UPI + cards is shockingly accurate.",
    initials: "TG",
    tint: "from-indigo-200 to-cyan-200",
  },
  {
    name: "Rhea Kapoor",
    username: "@rhea.kp",
    body: "The Monday-morning review is the best thing in my inbox. One paragraph, three actions. That's it.",
    initials: "RK",
    tint: "from-violet-200 to-pink-200",
  },
];

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);

function ReviewCard({ name, username, body, initials, tint }: Review) {
  return (
    <figure
      className={cn(
        "relative w-72 cursor-pointer overflow-hidden rounded-2xl border border-black/5 bg-white p-4",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(47,108,235,0.1)]",
        "transition hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-16px_rgba(47,108,235,0.18)]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br text-[0.78rem] font-bold text-neutral-700",
            tint,
          )}
        >
          {initials}
        </span>
        <div className="flex flex-col leading-tight">
          <figcaption className="text-[0.86rem] font-semibold text-neutral-900">
            {name}
          </figcaption>
          <p className="text-[0.72rem] text-neutral-400">{username}</p>
        </div>
      </div>
      <blockquote className="mt-3 text-[0.86rem] leading-relaxed text-neutral-600">
        “{body}”
      </blockquote>
    </figure>
  );
}

export function TestimonialMarquee() {
  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-4 overflow-hidden">
      <Marquee pauseOnHover className="[--duration:50s]">
        {firstRow.map((review) => (
          <ReviewCard key={review.username} {...review} />
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover className="[--duration:50s]">
        {secondRow.map((review) => (
          <ReviewCard key={review.username} {...review} />
        ))}
      </Marquee>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-[var(--slash-bg)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-[var(--slash-bg)] to-transparent" />
    </div>
  );
}
