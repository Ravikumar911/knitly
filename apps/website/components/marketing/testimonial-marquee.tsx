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
    body: "I wanted the dashboard without giving another company my whole money history. This feels much easier to trust.",
    initials: "AS",
    tint: "from-violet-200 to-fuchsia-200",
  },
  {
    name: "Meena Iyer",
    username: "@meena_iyer",
    body: "Seeing my Swiggy spend without building a spreadsheet was immediately useful. Narrow, but useful.",
    initials: "MI",
    tint: "from-cyan-200 to-violet-200",
  },
  {
    name: "Rahul Reddy",
    username: "@rdy.dev",
    body: "The best part is that it does not pretend to connect everything. It solves one clear problem first.",
    initials: "RR",
    tint: "from-amber-200 to-rose-200",
  },
  {
    name: "Priya Nair",
    username: "@priyacodes",
    body: "The setup is guided, and the dashboard itself feels polished and calm.",
    initials: "PN",
    tint: "from-emerald-200 to-cyan-200",
  },
  {
    name: "Karthik Menon",
    username: "@kmenon",
    body: "I like that setup tells me what is happening instead of hiding everything behind a spinner.",
    initials: "KM",
    tint: "from-rose-200 to-amber-200",
  },
  {
    name: "Sneha Joshi",
    username: "@snehaj",
    body: "The privacy story feels real because the app runs here, not in someone else's account.",
    initials: "SJ",
    tint: "from-fuchsia-200 to-violet-200",
  },
  {
    name: "Tanay Gupta",
    username: "@tanaygupta",
    body: "The scope is honest. It does Swiggy from Gmail today, and that makes the roadmap more believable.",
    initials: "TG",
    tint: "from-indigo-200 to-cyan-200",
  },
  {
    name: "Rhea Kapoor",
    username: "@rhea.kp",
    body: "I was wary of connecting finance email. Knowing it runs on my laptop made the difference.",
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
        "relative w-72 overflow-hidden rounded-2xl border border-black/5 bg-white p-4",
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
