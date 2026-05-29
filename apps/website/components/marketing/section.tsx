import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  align = "center",
  children,
  className,
  containerClassName,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("relative mx-auto w-full px-6 py-20 md:py-28", className)}
    >
      <div className={cn("mx-auto max-w-[1180px]", containerClassName)}>
        {(eyebrow || title || description) && (
          <div
            className={cn(
              "mx-auto mb-12 max-w-3xl",
              align === "center" ? "text-center" : "text-left",
            )}
          >
            {eyebrow && (
              <span className="slash-eyebrow">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-4))",
                  }}
                  aria-hidden="true"
                />
                {eyebrow}
              </span>
            )}
            <h2 className="mt-4 text-[2rem] font-bold leading-[1.05] tracking-tight md:text-[2.6rem]">
              {title}
            </h2>
            {description && (
              <p className="mt-4 text-base leading-relaxed text-neutral-500 md:text-lg">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
