"use client";

import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useState } from "react";

interface TypewriterTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  speed?: number;
  showCursor?: boolean;
  className?: string;
}

export function TypewriterText({
  text,
  speed = 100,
  showCursor = true,
  className,
  ...props
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  return (
    <span className={cn("inline-block", className)} {...props}>
      {displayedText}
      {showCursor && (
        <span className="animate-pulse text-current">|</span>
      )}
    </span>
  );
} 