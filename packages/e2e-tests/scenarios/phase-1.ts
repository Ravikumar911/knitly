import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const home = mkdtempSync(join(tmpdir(), "slashcash-phase-1-"));
const port = Number(process.env.SLASHCASH_E2E_PORT || 3219);
const baseUrl = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  SLASHCASH_HOME: home,
  SQLITE_DB_PATH: join(home, "db.sqlite"),
  SLASHCASH_PORT: String(port),
  SLASHCASH_NO_OPEN: "1",
};

let startProcess: ChildProcess | undefined;

async function main() {
  try {
    run("doctor", ["--fix"]);
    run("db", ["seed"]);

    startProcess = spawnSlashcash(["start", "--port", String(port), "--no-open"]);
    await waitForHealthz();

    await assertDashboardHtml();

    if (process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA !== "1") {
      await assertAssistantStream();
    } else {
      console.log("assistant: skipped because SLASHCASH_DOCTOR_SKIP_OLLAMA=1");
    }

    const status = run("status", []);
    assertIncludes(status.stdout, String(port), "status output includes port");

    run("stop", []);
    await waitForStartExit();

    console.log("Phase 1 E2E passed.");
  } finally {
    if (startProcess && !startProcess.killed) {
      startProcess.kill("SIGTERM");
    }
    rmSync(home, { recursive: true, force: true });
  }
}

function run(command: string, args: string[]) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "slashcash", "dev", "--", command, ...args],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `slashcash ${command} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  console.log(`slashcash ${command}: ok`);
  return result;
}

function spawnSlashcash(args: string[]) {
  const child = spawn(
    "pnpm",
    ["--filter", "slashcash", "dev", "--", ...args],
    {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  child.once("exit", (code) => {
    if (code && code !== 0) {
      console.error(`slashcash start exited with ${code}`);
    }
  });

  return child;
}

async function waitForHealthz() {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/healthz`);
      if (response.ok) {
        const body = await response.json() as { ok?: boolean; mode?: string };
        if (body.ok && body.mode === "local") {
          console.log("healthz: ok");
          return;
        }
        lastError = new Error(`unexpected healthz body ${JSON.stringify(body)}`);
      } else {
        lastError = new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }

  throw new Error(`healthz did not become ready: ${String(lastError)}`);
}

async function assertDashboardHtml() {
  const response = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" });
  if (response.status !== 200) {
    throw new Error(`dashboard returned HTTP ${response.status}`);
  }

  const html = await response.text();
  assertIncludes(html, "slash.cash", "dashboard HTML includes product name");
  if (html.includes("/login")) {
    throw new Error("dashboard HTML still references a login route");
  }

  console.log("dashboard: ok");
}

async function assertAssistantStream() {
  const response = await fetch(`${baseUrl}/api/assistant`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "phase-1-message",
      chatId: "phase-1-e2e-chat",
      message: {
        id: "phase-1-message",
        role: "user",
        parts: [{ type: "text", text: "Say one short sentence about my Swiggy data." }],
      },
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`assistant returned HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const firstChunk = await reader.read();
  reader.releaseLock();

  if (!firstChunk.value?.length) {
    throw new Error("assistant stream did not produce data");
  }

  console.log("assistant: ok");
}

async function waitForStartExit() {
  if (!startProcess) return;

  const exitCode = await new Promise<number | null>((resolveExit) => {
    const timeout = setTimeout(() => resolveExit(null), 10_000);
    startProcess?.once("exit", (code) => {
      clearTimeout(timeout);
      resolveExit(code);
    });
  });

  if (exitCode !== 0 && exitCode !== null) {
    throw new Error(`slashcash start exited with ${exitCode}`);
  }
}

function assertIncludes(value: string, expected: string, label: string) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected to find ${expected}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
