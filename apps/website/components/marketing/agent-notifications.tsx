"use client";

import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

interface Notification {
  name: string;
  description: string;
  icon: React.ReactNode;
  tone: "warn" | "ok" | "info" | "save";
  time: string;
}

const notifications: Notification[] = [
  {
    name: "Leak Agent",
    description: "Found 3 unused subscriptions · ₹4,260/yr",
    icon: <AlertTriangle className="h-4 w-4" />,
    tone: "warn",
    time: "2m",
  },
  {
    name: "Score Agent",
    description: "Money health score is 72 (+4)",
    icon: <Sparkles className="h-4 w-4" />,
    tone: "info",
    time: "5m",
  },
  {
    name: "Spend Agent",
    description: "Categorized 218 new transactions",
    icon: <CheckCircle2 className="h-4 w-4" />,
    tone: "ok",
    time: "9m",
  },
  {
    name: "Investor Agent",
    description: "Move ₹10,000 to SIP · stays in budget",
    icon: <CircleDollarSign className="h-4 w-4" />,
    tone: "save",
    time: "12m",
  },
];

const toneStyles: Record<Notification["tone"], { bg: string; fg: string; ring: string }> = {
  warn: {
    bg: "bg-amber-50",
    fg: "text-amber-700",
    ring: "ring-amber-100",
  },
  ok: {
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    ring: "ring-emerald-100",
  },
  info: {
    bg: "bg-violet-50",
    fg: "text-violet-700",
    ring: "ring-violet-100",
  },
  save: {
    bg: "bg-cyan-50",
    fg: "text-cyan-700",
    ring: "ring-cyan-100",
  },
};

function NotificationCard({ notification }: { notification: Notification }) {
  const tone = toneStyles[notification.tone];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]"
    >
      <span
        className={cn(
          "grid h-9 w-9 flex-none place-items-center rounded-xl ring-4",
          tone.bg,
          tone.fg,
          tone.ring,
        )}
      >
        {notification.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.86rem] font-semibold tracking-tight text-neutral-900">
            {notification.name}
          </span>
          <span className="text-[0.66rem] text-neutral-400">
            {notification.time} ago
          </span>
        </div>
        <p className="mt-0.5 text-[0.78rem] text-neutral-600 truncate">
          {notification.description}
        </p>
      </div>
    </motion.div>
  );
}

export function AgentNotifications({ className }: { className?: string }) {
  const [items, setItems] = useState<Notification[]>(notifications);

  useEffect(() => {
    const id = setInterval(() => {
      setItems((current) => {
        const [first, ...rest] = current;
        return [...rest, first as Notification];
      });
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-2.5 overflow-hidden",
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {items.slice(0, 4).map((n) => (
          <NotificationCard key={`${n.name}-${n.time}`} notification={n} />
        ))}
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
