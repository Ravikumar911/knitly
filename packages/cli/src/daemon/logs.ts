import { existsSync, readFileSync } from "node:fs";
import { resolveDashboardServiceLogPaths } from "./constants.js";

export function readDashboardServiceLogPaths(home: string) {
  return resolveDashboardServiceLogPaths(home);
}

export function readServiceLogTail(
  home: string,
  options: { tail?: number; stream?: "stdout" | "stderr" | "both" } = {},
) {
  const paths = resolveDashboardServiceLogPaths(home);
  const tail = options.tail ?? 50;
  const stream = options.stream ?? "both";
  const chunks: string[] = [];

  if (stream === "stdout" || stream === "both") {
    chunks.push(...tailFile(paths.stdoutPath, tail));
  }
  if (stream === "stderr" || stream === "both") {
    chunks.push(...tailFile(paths.stderrPath, tail));
  }

  return chunks;
}

function tailFile(path: string, tail: number) {
  if (!existsSync(path)) {
    return [];
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.slice(-tail);
}
