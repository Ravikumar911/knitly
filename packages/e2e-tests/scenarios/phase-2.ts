import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const home = mkdtempSync(join(tmpdir(), "slashcash-phase-2-"));
const fixtureDir = join(repoRoot, "packages", "e2e-tests", "fixtures", "gws");
const port = Number(process.env.SLASHCASH_E2E_PORT || 3220);
const baseUrl = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  SLASHCASH_HOME: home,
  SQLITE_DB_PATH: join(home, "db.sqlite"),
  SLASHCASH_ATTACHMENTS_DIR: join(home, "attachments"),
  SLASHCASH_PORT: String(port),
  SLASHCASH_NO_OPEN: "1",
  SLASHCASH_GWS_FIXTURE_DIR: fixtureDir,
  SLASHCASH_SYNC_SKIP_AI: "1",
  SLASHCASH_DOCTOR_SKIP_OLLAMA: "1",
  SLASHCASH_DOCTOR_SKIP_GWS: "1",
};

let startProcess: ChildProcess | undefined;

async function main() {
  try {
    run("onboard", ["--dry-run"]);
    const skills = run("skills", ["list"]);
    assertIncludes(skills.stdout, "gmail-swiggy", "skills list includes gmail-swiggy");
    assertIncludes(skills.stdout, "enabled", "skills list marks gmail-swiggy enabled");
    run("doctor", ["--quick"]);

    const sync = run("sync", ["--full"]);
    assertIncludes(sync.stdout, "1 processed", "sync imports fixture message");

    const snapshot = readDatabaseSnapshot();
    if (!snapshot.transactionId) {
      throw new Error("No Swiggy transaction was imported.");
    }
    if (!snapshot.attachmentPath || !existsSync(snapshot.attachmentPath)) {
      throw new Error(`Expected attachment file to exist at ${snapshot.attachmentPath}`);
    }

    run("skills", ["disable", "gmail-swiggy"]);
    runExpectFailure("sync", ["--full"], "gmail-swiggy skill is disabled");
    run("skills", ["enable", "gmail-swiggy"]);

    startProcess = spawnSlashcash(["start", "--port", String(port), "--no-open"]);
    await waitForHealthz();
    await assertAttachmentRoute(snapshot.transactionId);

    run("stop", []);
    await waitForStartExit();

    console.log("Phase 2 E2E passed.");
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

function runExpectFailure(command: string, args: string[], expected: string) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "slashcash", "dev", "--", command, ...args],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );

  if (result.status === 0) {
    throw new Error(`slashcash ${command} was expected to fail`);
  }

  assertIncludes(`${result.stdout}\n${result.stderr}`, expected, `slashcash ${command} failure message`);
  console.log(`slashcash ${command}: blocked as expected`);
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

function readDatabaseSnapshot(): { transactionId: string | null; attachmentPath: string | null } {
  const script = `
    const Database = require("better-sqlite3");
    const db = new Database(process.env.SQLITE_DB_PATH);
    const row = db.prepare(
      "select t.id as transactionId, e.attachment_storage_path as attachmentStoragePath from transactions_v2 t left join parsed_emails e on t.parsed_email_id = e.id where t.merchant_id = 'swiggy' order by t.created_at desc limit 1"
    ).get();
    const attachmentPaths = row?.attachmentStoragePath ? JSON.parse(row.attachmentStoragePath) : [];
    console.log(JSON.stringify({
      transactionId: row?.transactionId || null,
      attachmentPath: attachmentPaths[0] || null
    }));
  `;
  const result = spawnSync("node", ["-e", script], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`database snapshot failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }

  return JSON.parse(result.stdout) as { transactionId: string | null; attachmentPath: string | null };
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

async function assertAttachmentRoute(transactionId: string) {
  const response = await fetch(`${baseUrl}/api/attachments/${transactionId}`);
  if (!response.ok) {
    throw new Error(`attachment route returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/pdf")) {
    throw new Error(`attachment route returned ${contentType}`);
  }

  const body = await response.arrayBuffer();
  if (body.byteLength === 0) {
    throw new Error("attachment route returned an empty body");
  }

  console.log("attachment route: ok");
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
