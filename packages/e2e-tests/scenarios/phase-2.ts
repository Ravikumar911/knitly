import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const home = mkdtempSync(join(tmpdir(), "slashcash-phase-2-"));
const pythonSiteDir = mkdtempSync(join(tmpdir(), "slashcash-phase-2-py-"));
const fixtureDir = join(repoRoot, "packages", "e2e-tests", "fixtures", "imap");

function resolvePythonBin(): string {
  const fromEnv = process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON?.trim();
  if (fromEnv) return fromEnv;

  const candidates = [
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    "/usr/bin/python3",
  ];
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return "python3";
}

const pythonBin = resolvePythonBin();
const pythonSource = join(repoRoot, "packages", "pdf-extractor", "src");

const env = {
  ...process.env,
  SLASHCASH_HOME: home,
  SQLITE_DB_PATH: join(home, "db.sqlite"),
  SLASHCASH_ATTACHMENTS_DIR: join(home, "attachments"),
  SLASHCASH_IMAP_FIXTURE_DIR: fixtureDir,
  SLASHCASH_SYNC_SKIP_AI: "1",
  SLASHCASH_DOCTOR_SKIP_OLLAMA: "1",
  SLASHCASH_NO_OPEN: "1",
  SLASHCASH_PDF_EXTRACTOR_PYTHON: pythonBin,
  PYTHONPATH: `${pythonSiteDir}:${pythonSource}`,
};

try {
  preparePythonExtractorRuntime();
  run("onboard", ["--dry-run"]);

  const skills = run("skills", ["list"]);
  assertIncludes(
    skills.stdout,
    "gmail-swiggy",
    "skills list includes gmail-swiggy",
  );
  assertIncludes(
    skills.stdout,
    "enabled",
    "skills list marks gmail-swiggy enabled",
  );

  run("doctor", ["--quick"]);

  const sync = run("sync", ["--full"]);
  assertIncludes(sync.stdout, "1 processed", "sync ingests the IMAP fixture");
  if (readdirSync(join(home, "attachments")).length === 0) {
    throw new Error("sync did not write any attachment fixtures");
  }
  assertPdfLanePersisted();

  run("skills", ["disable", "gmail-swiggy"]);
  runExpectFailure("sync", ["--full"], "gmail-swiggy skill is disabled");
  run("skills", ["enable", "gmail-swiggy"]);

  console.log("Phase 2 E2E passed.");
} finally {
  rmSync(home, { recursive: true, force: true });
  rmSync(pythonSiteDir, { recursive: true, force: true });
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

  assertIncludes(
    `${result.stdout}\n${result.stderr}`,
    expected,
    `slashcash ${command} failure message`,
  );
  console.log(`slashcash ${command}: blocked as expected`);
}

function assertIncludes(value: string, expected: string, label: string) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected to find ${expected}`);
  }
}

function preparePythonExtractorRuntime() {
  runCommand(pythonBin, [
    "-m",
    "pip",
    "install",
    "--target",
    pythonSiteDir,
    "pydantic==2.13.3",
  ]);
  runCommand(pythonBin, ["-m", "slashcash_pdf_extractor", "--self-check"], {
    env,
  });
}

function assertPdfLanePersisted() {
  const script = [
    "import json, sqlite3, sys",
    "db = sqlite3.connect(sys.argv[1])",
    "db.row_factory = sqlite3.Row",
    'tx = db.execute("select amount, schema_used, data_source, extraction_confidence from transactions_v2 order by created_at desc limit 1").fetchone()',
    'email = db.execute("select parse_success, parse_errors from parsed_emails order by created_at desc limit 1").fetchone()',
    "print(json.dumps({",
    "  'tx': dict(tx) if tx else None,",
    "  'email': dict(email) if email else None,",
    "}))",
  ].join("\n");
  const output = runCommand(
    pythonBin,
    ["-c", script, join(home, "db.sqlite")],
    { env },
  );
  const payload = JSON.parse(output.stdout) as {
    tx: {
      amount: number;
      schema_used: string;
      data_source: string;
      extraction_confidence: number;
    } | null;
    email: {
      parse_success: number;
      parse_errors: string | null;
    } | null;
  };

  if (!payload.tx || !payload.email) {
    throw new Error(`phase-2 db assertions missing rows: ${output.stdout}`);
  }

  if (Math.abs(payload.tx.amount - 512.4) > 0.001) {
    throw new Error(`expected PDF amount 512.4, got ${payload.tx.amount}`);
  }
  if (payload.tx.schema_used !== "swiggy.docling.v1") {
    throw new Error(
      `expected swiggy.docling.v1, got ${payload.tx.schema_used}`,
    );
  }
  if (payload.tx.data_source !== "PDF_ATTACHMENT") {
    throw new Error(`expected PDF_ATTACHMENT, got ${payload.tx.data_source}`);
  }
  if (payload.email.parse_success !== 1) {
    throw new Error(
      `expected parsed_emails.parse_success = 1, got ${payload.email.parse_success}`,
    );
  }
}

function runCommand(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv } = {},
) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env || env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result;
}
