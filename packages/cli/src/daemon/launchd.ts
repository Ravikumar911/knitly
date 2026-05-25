import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import {
  DASHBOARD_LAUNCH_AGENT_LABEL,
  resolveDashboardServiceLogPaths,
  resolveLaunchAgentPlistPath,
} from "./constants.js";
import { resolveCliProgramArguments } from "./entrypoint.js";

type LaunchAgentInstallArgs = {
  port: number;
  home: string;
  dbPath: string;
  attachmentsPath: string;
};

function plistEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildLaunchAgentPlist(params: {
  label: string;
  programArguments: string[];
  stdoutPath: string;
  stderrPath: string;
  environment: Record<string, string>;
}) {
  const argsXml = params.programArguments
    .map((arg) => `\n      <string>${plistEscape(arg)}</string>`)
    .join("");
  const envXml = Object.entries(params.environment)
    .map(
      ([key, value]) =>
        `\n    <key>${plistEscape(key)}</key>\n    <string>${plistEscape(value)}</string>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${plistEscape(params.label)}</string>
    <key>Comment</key>
    <string>slash.cash local dashboard</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>ProgramArguments</key>
    <array>${argsXml}
    </array>
    <key>StandardInPath</key>
    <string>/dev/null</string>
    <key>StandardOutPath</key>
    <string>${plistEscape(params.stdoutPath)}</string>
    <key>StandardErrorPath</key>
    <string>${plistEscape(params.stderrPath)}</string>
    <key>EnvironmentVariables</key>
    <dict>${envXml}
    </dict>
  </dict>
</plist>
`;
}

function execLaunchctl(args: string[]) {
  return execFileSync("launchctl", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function resolveGuiDomain() {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error("Unable to resolve GUI launchd domain.");
  }
  return `gui/${uid}`;
}

export function buildDashboardServicePlan(args: LaunchAgentInstallArgs) {
  const { stdoutPath, stderrPath, logsDir } = resolveDashboardServiceLogPaths(
    args.home,
  );
  mkdirSync(logsDir, { recursive: true, mode: 0o700 });

  return {
    plistPath: resolveLaunchAgentPlistPath(),
    stdoutPath,
    stderrPath,
    programArguments: resolveCliProgramArguments([
      "server",
      "run",
      "--port",
      String(args.port),
    ]),
    environment: {
      HOME: homedir(),
      PATH: process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin",
      SLASHCASH_HOME: args.home,
      SQLITE_DB_PATH: args.dbPath,
      SLASHCASH_ATTACHMENTS_DIR: args.attachmentsPath,
      SLASHCASH_PORT: String(args.port),
      SLASHCASH_SERVICE: "1",
    },
  };
}

export function isLaunchAgentLoaded() {
  if (process.platform !== "darwin") {
    return false;
  }

  const plistPath = resolveLaunchAgentPlistPath();
  try {
    execLaunchctl(["print", `${resolveGuiDomain()}/${DASHBOARD_LAUNCH_AGENT_LABEL}`]);
    return true;
  } catch {
    return false;
  }
}

export function installLaunchAgent(args: LaunchAgentInstallArgs) {
  if (process.platform !== "darwin") {
    throw new Error("LaunchAgent install is only supported on macOS.");
  }

  const plan = buildDashboardServicePlan(args);
  const plist = buildLaunchAgentPlist({
    label: DASHBOARD_LAUNCH_AGENT_LABEL,
    programArguments: plan.programArguments,
    stdoutPath: plan.stdoutPath,
    stderrPath: plan.stderrPath,
    environment: plan.environment,
  });

  mkdirSync(dirname(plan.plistPath), { recursive: true, mode: 0o755 });
  writeFileSync(plan.plistPath, plist, { encoding: "utf8", mode: 0o600 });

  const domain = resolveGuiDomain();
  try {
    execLaunchctl(["bootout", domain, plan.plistPath]);
  } catch {
    // Service may not be loaded yet.
  }

  execLaunchctl(["bootstrap", domain, plan.plistPath]);
  return plan;
}

export function startLaunchAgent() {
  if (process.platform !== "darwin") {
    return;
  }

  execLaunchctl([
    "kickstart",
    "-k",
    `${resolveGuiDomain()}/${DASHBOARD_LAUNCH_AGENT_LABEL}`,
  ]);
}

export function stopLaunchAgent() {
  if (process.platform !== "darwin") {
    return;
  }

  const domain = resolveGuiDomain();
  const plistPath = resolveLaunchAgentPlistPath();
  try {
    execLaunchctl(["bootout", domain, plistPath]);
  } catch {
    // Service may already be stopped.
  }
}

export function uninstallLaunchAgent() {
  stopLaunchAgent();
}
