import { Github, Package } from "lucide-react";

import { GITHUB_URL, INSTALL_COMMAND, NPM_URL } from "@/lib/links";

interface InstallCtaProps {
  className?: string;
  showCommand?: boolean;
}

export function InstallCta({ className = "", showCommand = false }: InstallCtaProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={NPM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.92rem] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(47,108,235,0.4)] transition hover:opacity-95"
          style={{
            background:
              "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
          }}
        >
          <Package className="h-3.5 w-3.5" />
          Install the CLI
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-[0.92rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          <Github className="h-3.5 w-3.5" />
          Source on GitHub
        </a>
      </div>
      {showCommand && (
        <code className="inline-block rounded-xl border border-black/5 bg-white/80 px-4 py-2.5 font-mono text-[0.82rem] text-neutral-700 shadow-sm">
          <span className="text-neutral-400">$</span> {INSTALL_COMMAND}
        </code>
      )}
    </div>
  );
}
