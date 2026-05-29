"use client";

import {
  AlertTriangle,
  Brain,
  CircleDollarSign,
  FilePieChart,
  Plug,
  ScanSearch,
  TrendingUp,
} from "lucide-react";

import { OrbitingCircles } from "@workspace/ui/components/orbiting-circles";

const innerAgents = [
  {
    icon: <ScanSearch className="h-5 w-5 text-indigo-500" />,
    title: "Spend",
  },
  {
    icon: <AlertTriangle className="h-5 w-5 text-sky-500" />,
    title: "Leak",
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
    title: "Score",
  },
];

const outerAgents = [
  { icon: <Plug className="h-5 w-5 text-indigo-500" />, title: "Connector" },
  {
    icon: <CircleDollarSign className="h-5 w-5 text-cyan-500" />,
    title: "Investor",
  },
  { icon: <Brain className="h-5 w-5 text-[#635bff]" />, title: "Review" },
  {
    icon: <FilePieChart className="h-5 w-5 text-amber-500" />,
    title: "Alert",
  },
];

function AgentChip({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-black/5 bg-white pl-1.5 pr-3 py-1 shadow-[0_4px_16px_-4px_rgba(47,108,235,0.14)]">
      <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-neutral-50 ring-1 ring-black/5">
        {icon}
      </span>
      <span className="text-[0.72rem] font-semibold tracking-tight text-neutral-700">
        {title}
      </span>
    </div>
  );
}

export function AgentsOrbit() {
  return (
    <div className="relative flex h-[420px] w-full items-center justify-center overflow-hidden">
      {/* Background halo */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(47,108,235,0.1), transparent 55%)",
        }}
      />

      {/* Center logo */}
      <div className="relative grid h-20 w-20 place-items-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, var(--slash-grad-1) 0%, var(--slash-grad-3) 100%)",
            boxShadow:
              "0 0 0 6px rgba(255,255,255,1), 0 24px 48px -12px rgba(47,108,235,0.32)",
          }}
        />
        <span className="relative text-3xl font-bold text-white">/</span>
      </div>

      <OrbitingCircles radius={120} duration={28} iconSize={44} path={false}>
        {innerAgents.map((agent) => (
          <AgentChip key={agent.title} {...agent} />
        ))}
      </OrbitingCircles>

      <OrbitingCircles
        radius={200}
        duration={36}
        iconSize={44}
        reverse
        path={false}
      >
        {outerAgents.map((agent) => (
          <AgentChip key={agent.title} {...agent} />
        ))}
      </OrbitingCircles>
    </div>
  );
}
