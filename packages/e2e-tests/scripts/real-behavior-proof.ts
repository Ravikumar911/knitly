import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ProofMode = "pdf-enabled" | "pdf-disabled";

type Args = {
  fixtureDir: string;
  outputDir: string;
  modes: ProofMode[];
  fixtures: string[];
  strict: boolean;
  keepTemp: boolean;
};

type ExpectedFixture = {
  kind?: string;
  amount?: number;
  orderId?: string;
  schemaUsed?: string;
  dataSource?: string;
};

type ExpectedFixtureFile =
  | ExpectedFixture
  | {
      modes?: Partial<Record<ProofMode, ExpectedFixture>>;
    };

type SyncOutcome = {
  kind: "processed" | "skipped_existing" | "skipped_non_transaction" | "failed";
  messageId: string;
  transactionId?: string;
  reason?: string;
  error?: unknown;
};

type TransactionRow = {
  id: string;
  parsedEmailId: string | null;
  emailId: string | null;
  emailThreadId: string | null;
  amount: number;
  currency: string | null;
  description: string | null;
  paymentMethod: string | null;
  referenceIds: unknown;
  merchantData: unknown;
  extractionConfidence: number | null;
  schemaUsed: string | null;
  dataSource: string | null;
  attachmentStoragePath: unknown;
};

type ActualFixture = {
  kind: SyncOutcome["kind"];
  messageId: string;
  transactionId: string | null;
  amount: number | null;
  orderId: string | null;
  schemaUsed: string | null;
  dataSource: string | null;
  extractionConfidence: number | null;
  provenance: unknown;
  warnings: string[];
  parseErrors: string[];
  paymentMethod: string | null;
  description: string | null;
  itemNames: string[];
  attachmentStoragePath: unknown;
  reason: string | null;
};

type FieldDiff = {
  field: string;
  expected: unknown;
  actual: unknown;
};

type FixtureProof = {
  fixture: string;
  emlPath: string;
  expectedPath: string | null;
  expected: ExpectedFixture | null;
  actual: ActualFixture;
  diffs: FieldDiff[];
};

type ModeProof = {
  mode: ProofMode;
  pdfExtractorDisabled: boolean;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
  beforeTransactionCount: number;
  afterTransactionCount: number;
  syncCounts: {
    processed: number;
    skipped_existing: number;
    skipped_non_transaction: number;
    failed: number;
  };
  fixtures: FixtureProof[];
};

type ProofBundle = {
  metadata: {
    generatedAt: string;
    repoRoot: string;
    fixtureDir: string;
    outputDir: string;
    sqliteDbPath: string;
    slashcashHome: string;
    attachmentsDir: string;
    modes: ProofMode[];
    strict: boolean;
    python: {
      executable: string | null;
      pythonPath: string | null;
    };
    notes: string[];
  };
  results: ModeProof[];
  summary: {
    fixtureCount: number;
    modesRun: number;
    diffCount: number;
    processedCount: number;
    skippedCount: number;
    failedCount: number;
  };
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const defaultFixtureDir = join(repoRoot, "packages/e2e-tests/fixtures/imap");
const defaultReportRoot = join(repoRoot, ".agents/skills/ingest-proof/reports");

const args = parseArgs(process.argv.slice(2));
const runTempRoot = await mkdtemp(join(tmpdir(), "slashcash-ingest-proof-"));
const slashcashHome = join(runTempRoot, "home");
const attachmentsDir = join(slashcashHome, "attachments");
const sqliteDbPath = join(slashcashHome, "db.sqlite");

process.env.SLASHCASH_HOME = slashcashHome;
process.env.SQLITE_DB_PATH = sqliteDbPath;
process.env.SLASHCASH_ATTACHMENTS_DIR = attachmentsDir;
process.env.SLASHCASH_ASSISTANT_PROVIDER = "none";
process.env.SLASHCASH_SYNC_FETCH_CONCURRENCY = "1";
process.env.SLASHCASH_SYNC_EXTRACT_CONCURRENCY = "1";
process.env.SLASHCASH_EXTRACT_PACING_MS = "0";

const python = configurePdfExtractor();
const selectedFixtures = selectFixtures(args.fixtureDir, args.fixtures);

mkdirSync(args.outputDir, { recursive: true });
mkdirSync(slashcashHome, { recursive: true });

const database = await import("../../database/src/index.js");
const tasks = await import("../../tasks/src/trigger/processEmails.js");

database.ensureLocalDatabase();

const notes = [
  "Fixture sync uses packages/tasks/src/gmail/imap-client.ts fixture mode and packages/tasks/src/trigger/processEmails.ts.",
  "Rows are written by packages/tasks/src/extract/pipeline.ts through exported @workspace/database helpers into an isolated SQLite database.",
  "The CLI sync command is IMAP/account backed, so this proof uses the closest local CLI-equivalent fixture path rather than real Gmail credentials.",
  "The runner forces SLASHCASH_ASSISTANT_PROVIDER=none so fixture proof is deterministic and does not call a model.",
];

const results: ModeProof[] = [];
for (const mode of args.modes) {
  results.push(
    await runMode({
      mode,
      fixtureDir: args.fixtureDir,
      selectedFixtures,
      database,
      tasks,
    }),
  );
}

const bundle: ProofBundle = {
  metadata: {
    generatedAt: new Date().toISOString(),
    repoRoot,
    fixtureDir: relativePath(args.fixtureDir),
    outputDir: relativePath(args.outputDir),
    sqliteDbPath,
    slashcashHome,
    attachmentsDir,
    modes: args.modes,
    strict: args.strict,
    python,
    notes,
  },
  results,
  summary: summarize(results),
};

const jsonPath = join(args.outputDir, "real-behavior-proof.json");
const markdownPath = join(args.outputDir, "real-behavior-proof.md");
writeFileSync(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`);
writeFileSync(markdownPath, renderMarkdown(bundle));

console.log(`Wrote ${relativePath(jsonPath)}`);
console.log(`Wrote ${relativePath(markdownPath)}`);

if (!args.keepTemp) {
  rmSync(runTempRoot, { recursive: true, force: true });
}

if (args.strict && bundle.summary.diffCount > 0) {
  console.error(
    `Real behavior proof found ${bundle.summary.diffCount} expectation diff(s).`,
  );
  process.exitCode = 1;
}

async function runMode(input: {
  mode: ProofMode;
  fixtureDir: string;
  selectedFixtures: string[];
  database: typeof import("../../database/src/index.js");
  tasks: typeof import("../../tasks/src/trigger/processEmails.js");
}): Promise<ModeProof> {
  const startedAt = new Date();
  await input.database.clearLocalSeedData();
  input.database.ensureLocalDatabase();
  rmSync(attachmentsDir, { recursive: true, force: true });
  mkdirSync(attachmentsDir, { recursive: true });

  const filteredDir = createFilteredFixtureDir(
    input.fixtureDir,
    input.selectedFixtures,
    input.mode,
  );
  process.env.SLASHCASH_IMAP_FIXTURE_DIR = filteredDir;
  if (input.mode === "pdf-disabled") {
    process.env.SLASHCASH_PDF_EXTRACTOR_DISABLED = "1";
  } else {
    delete process.env.SLASHCASH_PDF_EXTRACTOR_DISABLED;
  }

  const beforeTransactionCount = await input.database.getTransactionsCount(
    input.database.LOCAL_USER_ID,
  );
  const syncResult = await input.tasks.runEmailSync({
    userId: input.database.LOCAL_USER_ID,
    query: "from:(swiggy.in) newer_than:365d",
    full: true,
    reextract: true,
  });
  const afterTransactionCount = await input.database.getTransactionsCount(
    input.database.LOCAL_USER_ID,
  );
  const rows = (await input.database.getTransactionsWithEmails(
    input.database.LOCAL_USER_ID,
    undefined,
    500,
  )) as TransactionRow[];
  const rowsByEmailId = new Map(
    rows.flatMap((row) => (row.emailId ? [[row.emailId, row]] : [])),
  );
  const outcomes = syncResult.outcomes as SyncOutcome[];
  const outcomesByMessageId = new Map(
    outcomes.map((outcome) => [outcome.messageId, outcome]),
  );

  const fixtures = input.selectedFixtures.map((fixture) => {
    const outcome = outcomesByMessageId.get(fixture);
    const row = rowsByEmailId.get(fixture) ?? null;
    const expected = readExpected(input.fixtureDir, fixture, input.mode);
    const actual = toActualFixture(
      fixture,
      outcome ?? {
        kind: "failed",
        messageId: fixture,
        error: new Error("Fixture was not returned by sync outcomes."),
      },
      row,
    );

    return {
      fixture,
      emlPath: relativePath(join(input.fixtureDir, `${fixture}.eml`)),
      expectedPath: expected.path ? relativePath(expected.path) : null,
      expected: expected.value,
      actual,
      diffs: diffExpected(expected.value, actual),
    };
  });
  const finishedAt = new Date();

  return {
    mode: input.mode,
    pdfExtractorDisabled: input.mode === "pdf-disabled",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    elapsedMs: finishedAt.getTime() - startedAt.getTime(),
    beforeTransactionCount,
    afterTransactionCount,
    syncCounts: syncResult.counts,
    fixtures,
  };
}

function toActualFixture(
  fixture: string,
  outcome: SyncOutcome,
  row: TransactionRow | null,
): ActualFixture {
  const referenceIds = asRecord(row?.referenceIds);
  const merchantData = asRecord(row?.merchantData);
  const transaction = asRecord(merchantData?.transaction);
  const orderItems = Array.isArray(transaction?.orderItems)
    ? transaction.orderItems
    : [];
  const parseErrors = Array.isArray(merchantData?.parseErrors)
    ? merchantData.parseErrors.filter(isString)
    : [];
  const warnings = Array.isArray(merchantData?.warnings)
    ? merchantData.warnings.filter(isString)
    : [];

  return {
    kind: outcome.kind,
    messageId: outcome.messageId || fixture,
    transactionId: outcome.transactionId ?? row?.id ?? null,
    amount: row?.amount ?? null,
    orderId: stringOrNull(referenceIds?.orderId ?? transaction?.orderId),
    schemaUsed: row?.schemaUsed ?? null,
    dataSource: row?.dataSource ?? null,
    extractionConfidence: row?.extractionConfidence ?? null,
    provenance: merchantData?.provenance ?? null,
    warnings,
    parseErrors,
    paymentMethod: row?.paymentMethod ?? null,
    description: row?.description ?? null,
    itemNames: orderItems.map((item) => asRecord(item)?.name).filter(isString),
    attachmentStoragePath: row?.attachmentStoragePath ?? null,
    reason:
      outcome.kind === "failed"
        ? formatOutcomeError(outcome.error)
        : (outcome.reason ?? null),
  };
}

function diffExpected(
  expected: ExpectedFixture | null,
  actual: ActualFixture,
): FieldDiff[] {
  if (!expected) return [];
  const diffs: FieldDiff[] = [];
  for (const field of Object.keys(expected) as Array<keyof ExpectedFixture>) {
    const expectedValue = expected[field];
    const actualValue = actual[field as keyof ActualFixture];
    if (!sameValue(expectedValue, actualValue)) {
      diffs.push({
        field,
        expected: expectedValue,
        actual: actualValue,
      });
    }
  }
  return diffs;
}

function sameValue(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return Math.abs(left - right) < 0.001;
  }
  return left === right;
}

function readExpected(
  fixtureDir: string,
  fixture: string,
  mode: ProofMode,
): {
  path: string | null;
  value: ExpectedFixture | null;
} {
  const path = join(fixtureDir, `${fixture}.expected.json`);
  if (!existsSync(path)) return { path: null, value: null };
  const value = JSON.parse(readFileSync(path, "utf8")) as ExpectedFixtureFile;
  return {
    path,
    value: "modes" in value ? (value.modes?.[mode] ?? null) : value,
  };
}

function createFilteredFixtureDir(
  fixtureDir: string,
  fixtures: string[],
  mode: ProofMode,
) {
  const dir = join(runTempRoot, `fixtures-${mode}`);
  mkdirSync(dir, { recursive: true });
  for (const fixture of fixtures) {
    copyFileSync(
      join(fixtureDir, `${fixture}.eml`),
      join(dir, `${fixture}.eml`),
    );
  }
  return dir;
}

function selectFixtures(fixtureDir: string, requested: string[]) {
  const available = readdirSync(fixtureDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".eml"))
    .map((entry) => basename(entry.name, ".eml"))
    .sort();
  if (requested.length === 0) return available;

  const missing = requested.filter((fixture) => !available.includes(fixture));
  if (missing.length > 0) {
    throw new Error(
      `Unknown fixture(s): ${missing.join(", ")}. Available: ${available.join(", ")}`,
    );
  }
  return requested;
}

function summarize(results: ModeProof[]): ProofBundle["summary"] {
  const fixtureCount = results.reduce(
    (sum, result) => sum + result.fixtures.length,
    0,
  );
  const diffCount = results.reduce(
    (sum, result) =>
      sum +
      result.fixtures.reduce(
        (fixtureSum, fixture) => fixtureSum + fixture.diffs.length,
        0,
      ),
    0,
  );
  return {
    fixtureCount,
    modesRun: results.length,
    diffCount,
    processedCount: results.reduce(
      (sum, result) => sum + result.syncCounts.processed,
      0,
    ),
    skippedCount: results.reduce(
      (sum, result) =>
        sum +
        result.syncCounts.skipped_existing +
        result.syncCounts.skipped_non_transaction,
      0,
    ),
    failedCount: results.reduce(
      (sum, result) => sum + result.syncCounts.failed,
      0,
    ),
  };
}

function renderMarkdown(bundle: ProofBundle) {
  const lines = [
    "# Ingest Real Behavior Proof",
    "",
    `Generated: ${bundle.metadata.generatedAt}`,
    `Fixtures: ${bundle.metadata.fixtureDir}`,
    `SQLite DB: ${bundle.metadata.sqliteDbPath}`,
    `Attachments: ${bundle.metadata.attachmentsDir}`,
    `Strict: ${String(bundle.metadata.strict)}`,
    "",
    "## Summary",
    "",
    `- Modes run: ${bundle.summary.modesRun}`,
    `- Fixture observations: ${bundle.summary.fixtureCount}`,
    `- Processed: ${bundle.summary.processedCount}`,
    `- Skipped: ${bundle.summary.skippedCount}`,
    `- Failed: ${bundle.summary.failedCount}`,
    `- Expectation diffs: ${bundle.summary.diffCount}`,
    "",
    "## Notes",
    "",
    ...bundle.metadata.notes.map((note) => `- ${note}`),
    "",
  ];

  for (const result of bundle.results) {
    lines.push(
      `## ${result.mode}`,
      "",
      `- PDF extractor disabled: ${String(result.pdfExtractorDisabled)}`,
      `- Elapsed: ${result.elapsedMs}ms`,
      `- Transaction rows: ${result.beforeTransactionCount} -> ${result.afterTransactionCount}`,
      `- Counts: processed=${result.syncCounts.processed}, skipped_existing=${result.syncCounts.skipped_existing}, skipped_non_transaction=${result.syncCounts.skipped_non_transaction}, failed=${result.syncCounts.failed}`,
      "",
      "| Fixture | Kind | Schema | Source | Amount | Order ID | Warnings | Diffs |",
      "| --- | --- | --- | --- | ---: | --- | ---: | ---: |",
    );
    for (const fixture of result.fixtures) {
      lines.push(
        [
          fixture.fixture,
          fixture.actual.kind,
          fixture.actual.schemaUsed ?? "",
          fixture.actual.dataSource ?? "",
          fixture.actual.amount ?? "",
          fixture.actual.orderId ?? "",
          fixture.actual.warnings.length,
          fixture.diffs.length,
        ]
          .join(" | ")
          .replace(/^/, "| ") + " |",
      );
    }
    lines.push("");

    for (const fixture of result.fixtures) {
      lines.push(`### ${result.mode} / ${fixture.fixture}`, "");
      lines.push("```json");
      lines.push(
        JSON.stringify(
          {
            expected: fixture.expected,
            actual: fixture.actual,
            diffs: fixture.diffs,
          },
          null,
          2,
        ),
      );
      lines.push("```", "");
    }
  }

  return `${lines.join("\n")}\n`;
}

function configurePdfExtractor() {
  const sourcePath = join(repoRoot, "packages/pdf-extractor/src");
  const venvPython = join(repoRoot, "packages/pdf-extractor/.venv/bin/python");
  if (!process.env.PYTHONPATH && existsSync(sourcePath)) {
    process.env.PYTHONPATH = sourcePath;
  }
  if (!process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON) {
    process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON = existsSync(venvPython)
      ? venvPython
      : "python3";
  }
  return {
    executable: process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON ?? null,
    pythonPath: process.env.PYTHONPATH ?? null,
  };
}

function parseArgs(argv: string[]): Args {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const parsed: Args = {
    fixtureDir: defaultFixtureDir,
    outputDir: join(defaultReportRoot, timestamp),
    modes: ["pdf-enabled", "pdf-disabled"],
    fixtures: [],
    strict: true,
    keepTemp: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fixtures-dir") {
      parsed.fixtureDir = resolve(readValue(argv, (index += 1), arg));
    } else if (arg === "--output-dir") {
      parsed.outputDir = resolve(readValue(argv, (index += 1), arg));
    } else if (arg === "--mode") {
      parsed.modes = [parseMode(readValue(argv, (index += 1), arg))];
    } else if (arg === "--all-modes") {
      parsed.modes = ["pdf-enabled", "pdf-disabled"];
    } else if (arg === "--fixture") {
      parsed.fixtures.push(readValue(argv, (index += 1), arg));
    } else if (arg === "--strict") {
      parsed.strict = true;
    } else if (arg === "--no-strict") {
      parsed.strict = false;
    } else if (arg === "--keep-temp") {
      parsed.keepTemp = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  parsed.fixtureDir = resolve(parsed.fixtureDir);
  parsed.outputDir = resolve(parsed.outputDir);
  return parsed;
}

function parseMode(value: string): ProofMode {
  if (value === "pdf-enabled" || value === "pdf-disabled") return value;
  throw new Error("--mode must be pdf-enabled or pdf-disabled");
}

function readValue(argv: string[], index: number, flag: string) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: pnpm exec tsx packages/e2e-tests/scripts/real-behavior-proof.ts [options]

Options:
  --fixtures-dir <path>  IMAP fixture directory (default: packages/e2e-tests/fixtures/imap)
  --output-dir <path>    Proof bundle directory (default: .agents/skills/ingest-proof/reports/<timestamp>)
  --mode <mode>          Run one mode: pdf-enabled or pdf-disabled
  --all-modes            Run both modes (default)
  --fixture <name>       Limit to one fixture; repeat for more
  --strict               Exit non-zero on expectation diffs (default)
  --no-strict            Write proof but exit zero when expectations differ
  --keep-temp            Keep isolated DB/home directory for inspection
`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function formatOutcomeError(value: unknown) {
  if (!value) return null;
  if (value instanceof Error) return value.message;
  if (typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" ? message : JSON.stringify(value);
  }
  return String(value);
}

function relativePath(path: string) {
  return relative(repoRoot, path) || ".";
}
