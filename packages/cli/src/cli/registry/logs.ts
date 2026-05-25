import type { Command } from "commander";
import pc from "picocolors";
import { resolvePaths } from "../../config/paths.js";
import { readServiceLogTail } from "../../daemon/logs.js";
import {
  readLogEvents,
  type LogArea,
  type LogEvent,
  type LogLevel,
} from "../../runtime/log.js";

export function register(program: Command) {
  program
    .command("logs")
    .description("Show local structured logs")
    .option(
      "--tail <n>",
      "Number of lines to show",
      (value) => Number(value),
      50,
    )
    .option("-f, --follow", "Follow new log lines")
    .option(
      "--service",
      "Show LaunchAgent dashboard stdout/stderr instead of structured logs",
    )
    .option(
      "--stderr",
      "With --service, show stderr only",
    )
    .option(
      "--filter <areas>",
      "Comma-separated areas, for example cron,ingest",
    )
    .option(
      "--since <duration>",
      "Only show recent logs, for example 5m, 1h, 2d",
    )
    .option("--json", "Print raw JSON events")
    .option(
      "--level <level>",
      "Minimum level: debug, info, warn, error",
      "info",
    )
    .action(
      async (options: {
        tail: number;
        follow?: boolean;
        service?: boolean;
        stderr?: boolean;
        filter?: string;
        since?: string;
        json?: boolean;
        level: LogLevel;
      }) => {
        if (options.service) {
          printServiceLogs({
            tail: options.tail,
            stderrOnly: options.stderr === true,
          });
          return;
        }

        const filter = parseAreas(options.filter);
        const sinceMs = options.since
          ? Date.now() - parseDurationMs(options.since)
          : undefined;
        let lastTs = 0;

        const print = (events: LogEvent[]) => {
          for (const event of events) {
            if (event.ts <= lastTs) continue;
            lastTs = Math.max(lastTs, event.ts);
            console.log(
              options.json ? JSON.stringify(event) : formatEvent(event),
            );
          }
        };

        print(
          readLogEvents({
            tail: options.tail,
            areas: filter,
            sinceMs,
            minLevel: options.level,
          }),
        );

        if (!options.follow) return;

        await new Promise<void>((resolve) => {
          const timer = setInterval(() => {
            print(
              readLogEvents({
                areas: filter,
                sinceMs: lastTs + 1,
                minLevel: options.level,
              }),
            );
          }, 1_000);

          process.once("SIGINT", () => {
            clearInterval(timer);
            resolve();
          });
        });
      },
    );
}

function parseAreas(value?: string): LogArea[] | undefined {
  if (!value) return undefined;
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean) as LogArea[];
}

function parseDurationMs(value: string) {
  const match = value.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    throw new Error("Duration must look like 5m, 1h, or 2d.");
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === "m") return amount * 60 * 1000;
  if (unit === "h") return amount * 60 * 60 * 1000;
  return amount * 24 * 60 * 60 * 1000;
}

function formatEvent(event: LogEvent) {
  const timestamp = new Date(event.ts).toISOString();
  const level = colorLevel(event.level);
  const details = Object.entries(event)
    .filter(([key]) => !["ts", "level", "area", "msg"].includes(key))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
  return `${timestamp} ${level} ${event.area} ${event.msg}${details ? ` ${details}` : ""}`;
}

function colorLevel(level: LogLevel) {
  if (level === "error") return pc.red(level);
  if (level === "warn") return pc.yellow(level);
  if (level === "debug") return pc.gray(level);
  return pc.green(level);
}

function printServiceLogs(options: { tail: number; stderrOnly: boolean }) {
  const paths = resolvePaths();
  const lines = readServiceLogTail(paths.home, {
    tail: options.tail,
    stream: options.stderrOnly ? "stderr" : "both",
  });
  if (lines.length === 0) {
    console.log("No dashboard service logs yet.");
    return;
  }
  for (const line of lines) {
    console.log(line);
  }
}
