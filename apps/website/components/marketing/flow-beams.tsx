"use client";

import {
  forwardRef,
  useRef,
  type ComponentPropsWithoutRef,
  type Ref,
} from "react";
import {
  BadgeIndianRupee,
  Brain,
  CreditCard,
  FileSpreadsheet,
  Mail,
  Receipt,
  Smartphone,
  TrendingUp,
} from "lucide-react";

import { AnimatedBeam } from "@workspace/ui/components/animated-beam";
import { cn } from "@workspace/ui/lib/utils";

const Circle = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & { size?: "sm" | "md" | "lg" }
>(({ className, children, size = "md" }, ref) => {
  const sizeClass =
    size === "lg" ? "size-16" : size === "sm" ? "size-10" : "size-12";
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex items-center justify-center rounded-full border-2 border-black/5 bg-white shadow-[0_0_0_8px_white,0_8px_24px_-8px_rgba(47,108,235,0.2)]",
        sizeClass,
        className,
      )}
    >
      {children}
    </div>
  );
});
Circle.displayName = "Circle";

export function FlowBeams() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const hubRef = useRef<HTMLDivElement>(null);
  const outputRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  const sources = [
    { icon: <Smartphone className="h-5 w-5 text-sky-500" />, label: "UPI" },
    {
      icon: <CreditCard className="h-5 w-5 text-indigo-500" />,
      label: "Cards",
    },
    { icon: <Mail className="h-5 w-5 text-[#635bff]" />, label: "Email" },
    {
      icon: <Receipt className="h-5 w-5 text-teal-500" />,
      label: "Statements",
    },
    {
      icon: <FileSpreadsheet className="h-5 w-5 text-[#2f6ceb]" />,
      label: "PDF/CSV",
    },
  ];

  const outputs = [
    {
      icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
      label: "Score",
    },
    {
      icon: <BadgeIndianRupee className="h-5 w-5 text-emerald-600" />,
      label: "Save",
    },
    { icon: <Brain className="h-5 w-5 text-emerald-600" />, label: "Decide" },
  ];

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex h-[540px] w-full max-w-[1000px] items-center justify-between rounded-3xl border border-black/5 bg-white/60 p-10 backdrop-blur-sm md:p-14"
    >
      <div className="flex h-full flex-col items-center justify-around gap-4">
        {sources.map((s, i) => (
          <div key={s.label} className="flex flex-col items-center gap-2">
            <Circle ref={sourceRefs[i] as Ref<HTMLDivElement>}>{s.icon}</Circle>
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-neutral-500">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center gap-1">
        <Circle ref={hubRef} size="lg" className="!border-0">
          <span
            className="grid h-full w-full place-items-center rounded-full text-lg font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-4))",
            }}
          >
            /
          </span>
        </Circle>
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-neutral-700">
          Local agents
        </span>
      </div>

      <div className="flex h-full flex-col items-center justify-around gap-6">
        {outputs.map((s, i) => (
          <div key={s.label} className="flex flex-col items-center gap-2">
            <Circle ref={outputRefs[i] as Ref<HTMLDivElement>}>{s.icon}</Circle>
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-neutral-500">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Beams: sources → hub */}
      {sourceRefs.map((ref, i) => (
        <AnimatedBeam
          key={`in-${i}`}
          containerRef={containerRef}
          fromRef={ref}
          toRef={hubRef}
          duration={5}
          delay={i * 0.3}
          curvature={i % 2 === 0 ? 30 : -30}
          gradientStartColor="#635bff"
          gradientStopColor="#0ea5e9"
          pathColor="#e5e5e5"
          pathOpacity={0.5}
        />
      ))}
      {/* Beams: hub → outputs */}
      {outputRefs.map((ref, i) => (
        <AnimatedBeam
          key={`out-${i}`}
          containerRef={containerRef}
          fromRef={hubRef}
          toRef={ref}
          duration={5}
          delay={1 + i * 0.3}
          curvature={i === 1 ? 0 : i === 0 ? -30 : 30}
          gradientStartColor="#2f6ceb"
          gradientStopColor="#10b981"
          pathColor="#e5e5e5"
          pathOpacity={0.5}
        />
      ))}
    </div>
  );
}
