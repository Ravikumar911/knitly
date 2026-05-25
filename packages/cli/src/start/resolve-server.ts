import { accessSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

export type DashboardLaunchTarget =
  | { mode: "packaged"; serverPath: string }
  | { mode: "dev"; appDir: string };

export function resolveDashboardLaunch(): DashboardLaunchTarget {
  const packaged = findPackagedServer();
  if (packaged) {
    return { mode: "packaged", serverPath: packaged };
  }

  return { mode: "dev", appDir: findMainAppDir() };
}

export function findPackagedServer(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  if (!here.includes(`${sep}dist${sep}`)) {
    return null;
  }

  const candidates = [
    join(here, "..", "app", "apps", "main", "server.js"),
    join(here, "..", "app", "server.js"),
  ];

  for (const candidate of candidates) {
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      // Continue looking for the packaged standalone server.
    }
  }

  return null;
}

function findMainAppDir() {
  const fromCwd = join(process.cwd(), "apps", "main");
  try {
    accessSync(join(fromCwd, "package.json"));
    return fromCwd;
  } catch {
    const here = dirname(fileURLToPath(import.meta.url));
    const fromPackage = join(here, "..", "..", "..", "..", "apps", "main");
    accessSync(join(fromPackage, "package.json"));
    return fromPackage;
  }
}
