#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const INGEST_PREFIXES = [
  "packages/tasks/src/extract/",
  "packages/tasks/src/merchants/swiggy/",
  "packages/pdf-extractor/",
  "packages/e2e-tests/fixtures/imap/",
  "packages/e2e-tests/fixtures/pdfs/",
  "qa/scenarios/ingest/",
];

const REQUIRED_INGEST_SIBLINGS = [
  {
    path: "packages/tasks/src/extract/pipeline.ts",
    reason:
      "runtime merge point for PDF, LLM, fallback, schemaUsed, dataSource, and storage provenance",
  },
  {
    path: "packages/tasks/src/extract/body-fallback.ts",
    reason: "body-only fallback owner for deterministic Swiggy extraction",
  },
  {
    path: "packages/tasks/src/extract/swiggy-body-signals.ts",
    reason:
      "shared order id, amount, restaurant, payment method, and marketing signal parser",
  },
  {
    path: "packages/tasks/src/extract/swiggy-llm.ts",
    reason:
      "LLM-normalization sibling that reuses body signals and provenance decisions",
  },
  {
    path: "packages/tasks/src/extract/pdf-extractor.ts",
    reason: "Python PDF extractor bridge and subprocess failure behavior",
  },
  {
    path: "packages/tasks/src/extract/pdf-extractor-schema.ts",
    reason: "typed contract for parsed PDF fields and source quality",
  },
  {
    path: "packages/tasks/src/extract/swiggy-deterministic.ts",
    reason: "provenance type shared by deterministic pipeline outputs",
  },
  {
    path: "packages/tasks/src/merchants/swiggy/schema.ts",
    reason: "merchant schema used to validate transaction fields",
  },
  {
    path: "packages/tasks/src/extract/body-fallback.test.ts",
    reason: "focused fallback fixture coverage",
  },
  {
    path: "packages/tasks/src/extract/swiggy-body-signals.test.ts",
    reason: "focused marketing and body signal coverage",
  },
  {
    path: "packages/tasks/src/extract/pipeline.test.ts",
    reason:
      "pipeline behavior coverage for schemaUsed, dataSource, and provenance",
  },
  {
    path: "packages/tasks/src/extract/pipeline.integration.test.ts",
    reason:
      "real extractor integration gate when VITEST_INTEGRATION is enabled",
  },
  {
    path: "packages/e2e-tests/fixtures/imap",
    reason: "committed EML fixtures and expected JSON proof inputs",
  },
  {
    path: "packages/e2e-tests/scripts/fixtures-check.ts",
    reason: "fixture canonicalization and EML sanity gate",
  },
];

const DEFAULT_GATES = [
  "pnpm typecheck",
  "pnpm lint",
  "pnpm test",
  "pnpm architecture-smells",
  "pnpm fixtures:check",
];

const INGEST_GATES = ["pnpm --filter @workspace/tasks test", "pnpm e2e:ingest"];

const startedAt = Date.now();
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = dirname(scriptPath);

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 2;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const repoRoot = resolveRepoRoot(args.repoRoot);
  const reportDir = resolve(
    repoRoot,
    args.reportDir || ".agents/skills/autoreview/reports",
  );
  const heartbeat = startHeartbeat(args.heartbeatMs);

  heartbeat.setPhase("collect-scope");
  const git = collectGitScope(repoRoot, args.base, args.commit);
  const scopeFiles = unique(resolveScopeFiles(git, args.mode));
  const ingestFiles = scopeFiles.filter(isIngestPath);
  const ingestScan = scanIngestSiblings(repoRoot, ingestFiles);

  heartbeat.setPhase("review");
  const findings = [];

  const gates = args.noGates
    ? []
    : resolveGates(args.gates, args.gateMode, ingestFiles.length > 0);
  const gateResults = [];

  if (args.noGates) {
    heartbeat.setPhase("skip-gates");
  } else {
    heartbeat.setPhase("run-gates");
    if (args.parallelGates) {
      gateResults.push(
        ...(await Promise.all(
          gates.map((command) => runGate(command, repoRoot)),
        )),
      );
    } else {
      for (const command of gates) {
        gateResults.push(await runGate(command, repoRoot));
      }
    }
    findings.push(...buildGateFindings(gateResults));
  }
  findings.push(
    ...buildIngestFindings(repoRoot, git, ingestFiles, ingestScan, gateResults),
  );

  heartbeat.stop();

  const actionableFindings = findings.filter((finding) => finding.actionable);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: process.argv.map(shellQuote).join(" "),
    mode: args.mode,
    commit: args.commit,
    repoRoot,
    baseRef: git.baseRef,
    branch: git.branch,
    status: actionableFindings.length === 0 ? "clean" : "actionable",
    summary: {
      dirtyFileCount: git.dirtyFiles.length,
      committedFileCount: git.committedFiles.length,
      scopeFileCount: scopeFiles.length,
      ingestFileCount: ingestFiles.length,
      gateCount: gateResults.length,
      actionableFindingCount: actionableFindings.length,
    },
    dirtyScope: git.statusEntries,
    committedScope: git.committedFiles,
    scopeFiles,
    ingest: {
      changedFiles: ingestFiles,
      surfaces: INGEST_PREFIXES,
      siblingScans: ingestScan,
      note:
        ingestFiles.length > 0
          ? "Ingest changes require sibling analysis across pipeline, body fallback, body signals, merchant schema, PDF extractor, fixtures, goldens, and provenance handling."
          : "No ingest surfaces changed in the detected scope.",
    },
    gates: args.noGates
      ? [
          {
            command: "<skipped>",
            skipped: true,
            reason: "--no-gates",
            exitCode: 0,
            durationMs: 0,
            stdoutTail: "",
            stderrTail: "",
          },
        ]
      : gateResults,
    findings: findings.map(stripInternalFindingFields),
    artifacts: {},
  };

  mkdirSync(reportDir, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "")
    .replaceAll(".", "");
  const baseName = args.reportName || `autoreview-${stamp}`;
  const jsonPath = join(reportDir, `${baseName}.json`);
  const markdownPath = join(reportDir, `${baseName}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderMarkdown(report), "utf8");
  report.artifacts = {
    json: relative(repoRoot, jsonPath),
    markdown: relative(repoRoot, markdownPath),
  };
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderMarkdown(report), "utf8");

  console.log(
    `autoreview report written: ${report.artifacts.json} and ${report.artifacts.markdown}`,
  );
  console.log(
    `autoreview result: ${report.status} (${actionableFindings.length} actionable findings)`,
  );

  process.exitCode = actionableFindings.length === 0 ? 0 : 1;
}

function parseArgs(argv) {
  const args = {
    base: null,
    gates: [],
    gateMode: "default",
    heartbeatMs: 30_000,
    help: false,
    commit: null,
    mode: "auto",
    noGates: false,
    parallelGates: false,
    reportDir: null,
    reportName: null,
    repoRoot: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--no-gates") {
      args.noGates = true;
    } else if (arg === "--repo-root") {
      args.repoRoot = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--repo-root=")) {
      args.repoRoot = arg.slice("--repo-root=".length);
    } else if (arg === "--report-dir") {
      args.reportDir = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--report-dir=")) {
      args.reportDir = arg.slice("--report-dir=".length);
    } else if (arg === "--base") {
      args.base = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--base=")) {
      args.base = arg.slice("--base=".length);
    } else if (arg === "--mode") {
      args.mode = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--mode=")) {
      args.mode = arg.slice("--mode=".length);
    } else if (arg === "--commit") {
      args.commit = requireValue(argv, ++index, arg);
      args.mode = "commit";
    } else if (arg.startsWith("--commit=")) {
      args.commit = arg.slice("--commit=".length);
      args.mode = "commit";
    } else if (arg === "--gate") {
      args.gates.push(requireValue(argv, ++index, arg));
    } else if (arg.startsWith("--gate=")) {
      args.gates.push(arg.slice("--gate=".length));
    } else if (arg === "--gates") {
      args.gateMode = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--gates=")) {
      args.gateMode = arg.slice("--gates=".length);
    } else if (arg === "--parallel-gates") {
      args.parallelGates = true;
    } else if (arg === "--report-name") {
      args.reportName = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--report-name=")) {
      args.reportName = arg.slice("--report-name=".length);
    } else if (arg === "--heartbeat-ms") {
      args.heartbeatMs = Number(requireValue(argv, ++index, arg));
    } else if (arg.startsWith("--heartbeat-ms=")) {
      args.heartbeatMs = Number(arg.slice("--heartbeat-ms=".length));
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isFinite(args.heartbeatMs) || args.heartbeatMs < 250) {
    throw new Error("--heartbeat-ms must be a number >= 250");
  }
  if (!["auto", "local", "branch", "commit"].includes(args.mode)) {
    throw new Error("--mode must be one of auto, local, branch, commit");
  }
  if (args.mode === "commit" && !args.commit) {
    args.commit = "HEAD";
  }
  if (args.reportName && !/^[A-Za-z0-9._-]+$/.test(args.reportName)) {
    throw new Error(
      "--report-name may only contain letters, digits, dot, underscore, and dash",
    );
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node ${relative(process.cwd(), scriptPath)} [options]

Options:
  --repo-root <path>       Repo root to inspect. Defaults to git top-level.
  --mode <mode>            auto, local, branch, or commit. Defaults to auto.
  --base <ref>             Compare committed branch changes against this ref.
  --commit <ref>           Review a single commit or ref. Implies --mode commit.
  --report-dir <path>      Report directory. Defaults to .agents/skills/autoreview/reports.
  --report-name <name>     Stable report base name without extension.
  --no-gates               Skip gates for fast self-tests.
  --gate <command>         Run this gate command. Repeatable.
  --gates <mode>           default, minimal, or none.
  --parallel-gates         Run selected gates concurrently.
  --heartbeat-ms <ms>      Heartbeat interval. Defaults to 30000.
  --help                   Show this help.
`);
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value) throw new Error(`${option} requires a value`);
  return value;
}

function resolveRepoRoot(explicitRoot) {
  if (explicitRoot) return resolve(explicitRoot);
  const result = runGit(process.cwd(), ["rev-parse", "--show-toplevel"], {
    allowFailure: true,
  });
  if (result.status === 0) return result.stdout.trim();
  return resolve(scriptDir, "../../../..");
}

function collectGitScope(repoRoot, explicitBase, commit) {
  const branch = runGit(repoRoot, ["branch", "--show-current"], {
    allowFailure: true,
  }).stdout.trim();
  const baseRef = explicitBase || resolveDefaultBase(repoRoot);
  const statusEntries = parseStatus(
    runGit(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"])
      .stdout,
  );
  const dirtyFiles = unique(statusEntries.map((entry) => entry.path));
  const committedFiles =
    baseRef && revExists(repoRoot, baseRef)
      ? parseLines(
          runGit(repoRoot, ["diff", "--name-only", `${baseRef}...HEAD`], {
            allowFailure: true,
          }).stdout,
        )
      : [];

  return {
    baseRef,
    branch,
    commit,
    commitFiles: (commit) =>
      parseLines(
        runGit(
          repoRoot,
          ["diff-tree", "--no-commit-id", "--name-only", "-r", commit],
          {
            allowFailure: true,
          },
        ).stdout,
      ),
    statusEntries,
    dirtyFiles,
    committedFiles,
  };
}

function resolveScopeFiles(git, mode) {
  if (mode === "local") return git.dirtyFiles;
  if (mode === "branch") return git.committedFiles;
  if (mode === "commit") return git.commitFiles(git.commit || "HEAD");
  return [...git.committedFiles, ...git.dirtyFiles];
}

function resolveDefaultBase(repoRoot) {
  const upstream = runGit(
    repoRoot,
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
    { allowFailure: true },
  ).stdout.trim();
  if (upstream) return upstream;
  if (revExists(repoRoot, "origin/main")) return "origin/main";
  if (revExists(repoRoot, "main")) return "main";
  return null;
}

function revExists(repoRoot, ref) {
  return (
    runGit(repoRoot, ["rev-parse", "--verify", `${ref}^{commit}`], {
      allowFailure: true,
    }).status === 0
  );
}

function parseStatus(stdout) {
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2);
      const rawPath = line.slice(3);
      const path = rawPath.includes(" -> ")
        ? rawPath.slice(rawPath.indexOf(" -> ") + 4)
        : rawPath;
      return { status, path };
    });
}

function parseLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isIngestPath(filePath) {
  return INGEST_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function scanIngestSiblings(repoRoot, ingestFiles) {
  if (ingestFiles.length === 0) return [];

  return ingestFiles.map((trigger) => ({
    trigger,
    siblings: REQUIRED_INGEST_SIBLINGS.flatMap((sibling) =>
      resolveSiblingReferences(repoRoot, sibling),
    ),
  }));
}

function resolveSiblingReferences(repoRoot, sibling) {
  const absolute = join(repoRoot, sibling.path);
  if (!existsSync(absolute)) return [];

  if (isDirectory(absolute)) {
    return listDirectoryFiles(absolute)
      .filter((filePath) => /\.(eml|json|pdf|ts|tsx|py|md)$/.test(filePath))
      .slice(0, 24)
      .map((filePath) => ({
        file_path: relative(repoRoot, filePath),
        line: 1,
        reason: sibling.reason,
      }));
  }

  return [
    {
      file_path: sibling.path,
      line: findInterestingLine(absolute),
      reason: sibling.reason,
    },
  ];
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function listDirectoryFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (
      entry.isDirectory() &&
      ![
        ".venv",
        ".pytest_cache",
        ".ruff_cache",
        "__pycache__",
        "node_modules",
      ].includes(entry.name)
    ) {
      return listDirectoryFiles(path);
    }
    return entry.isFile() ? [path] : [];
  });
}

function findInterestingLine(filePath) {
  const content = readFileSync(filePath, "utf8");
  const patterns = [
    /fallbackSwiggy/,
    /extractSwiggyBodySignals/,
    /isSwiggyMarketingEmail/,
    /extractTransactionFromEmail/,
    /schemaUsed/,
    /dataSource/,
    /provenance/,
    /describe\(/,
  ];
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) =>
    patterns.some((pattern) => pattern.test(line)),
  );
  return index >= 0 ? index + 1 : 1;
}

function buildIngestFindings(
  repoRoot,
  git,
  ingestFiles,
  ingestScan,
  gateResults,
) {
  if (ingestFiles.length === 0) return [];
  if (hasPassedIngestProof(gateResults)) return [];

  return ingestFiles.map((filePath) => {
    const line = firstChangedLine(repoRoot, filePath, git.baseRef);
    const isBodyFallback =
      filePath === "packages/tasks/src/extract/body-fallback.ts";
    const scan = ingestScan.find((entry) => entry.trigger === filePath);
    const siblingSummary = scan
      ? scan.siblings
          .slice(0, 8)
          .map((sibling) => `${sibling.file_path}:${sibling.line}`)
          .join(", ")
      : "no sibling scan available";
    return {
      title: isBodyFallback
        ? "Swiggy body fallback changed; verify sibling extraction paths"
        : "Ingest surface changed; closeout proof is required",
      body: [
        `${filePath} is in the deterministic ingest surface.`,
        "Per the ClawSweeper policy, this needs a real path read, focused gates, sibling analysis, and fixture or dogfood proof before closeout.",
        `Sibling scan noted: ${siblingSummary}.`,
      ].join(" "),
      priority: isBodyFallback ? "P1" : "P2",
      confidence: 0.95,
      category: "ingest-edge",
      code_location: { file_path: filePath, line },
      suggested_fix:
        "Read the cited siblings, run focused extraction tests/fixtures, capture exact schemaUsed/dataSource/provenance/amount/order values, then rerun autoreview with a passing pnpm e2e:ingest or real-behavior-proof gate.",
      actionable: true,
    };
  });
}

function hasPassedIngestProof(gateResults) {
  return gateResults.some(
    (gate) =>
      gate.exitCode === 0 &&
      /\b(e2e:ingest|real-behavior-proof(?:\.ts)?)\b/.test(gate.command),
  );
}

function firstChangedLine(repoRoot, filePath, baseRef) {
  const dirtyDiff = runGit(repoRoot, ["diff", "--unified=0", "--", filePath], {
    allowFailure: true,
  }).stdout;
  const dirtyLine = parseFirstAddedLine(dirtyDiff);
  if (dirtyLine) return dirtyLine;

  if (baseRef && revExists(repoRoot, baseRef)) {
    const branchDiff = runGit(
      repoRoot,
      ["diff", "--unified=0", `${baseRef}...HEAD`, "--", filePath],
      { allowFailure: true },
    ).stdout;
    const branchLine = parseFirstAddedLine(branchDiff);
    if (branchLine) return branchLine;
  }

  return 1;
}

function parseFirstAddedLine(diff) {
  const match = diff.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/m);
  return match ? Number(match[1]) : null;
}

function resolveGates(customGates, gateMode, hasIngestChanges) {
  if (customGates.length > 0) return customGates;
  if (gateMode === "none") return [];
  if (gateMode === "minimal") return ["pnpm typecheck", "pnpm test"];
  if (gateMode !== "default") {
    throw new Error(`Unknown --gates mode: ${gateMode}`);
  }

  return unique([...DEFAULT_GATES, ...(hasIngestChanges ? INGEST_GATES : [])]);
}

async function runGate(command, cwd) {
  const gateStartedAt = Date.now();
  console.log(`autoreview gate start: ${command}`);
  const result = await spawnShell(command, cwd);
  const durationMs = Date.now() - gateStartedAt;
  console.log(
    `autoreview gate ${result.exitCode === 0 ? "pass" : "fail"}: ${command} elapsed=${formatElapsed(durationMs)}`,
  );
  return {
    command,
    skipped: false,
    exitCode: result.exitCode,
    durationMs,
    stdoutTail: tail(result.stdout, 5000),
    stderrTail: tail(result.stderr, 5000),
  };
}

function spawnShell(command, cwd) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const value = chunk.toString();
      stdout += value;
      process.stdout.write(value);
    });
    child.stderr.on("data", (chunk) => {
      const value = chunk.toString();
      stderr += value;
      process.stderr.write(value);
    });
    child.on("close", (exitCode) => {
      resolvePromise({ exitCode: exitCode ?? 1, stdout, stderr });
    });
    child.on("error", (error) => {
      resolvePromise({ exitCode: 1, stdout, stderr: formatError(error) });
    });
  });
}

function buildGateFindings(gates) {
  return gates
    .filter((gate) => gate.exitCode !== 0)
    .map((gate) => ({
      title: `Gate failed: ${gate.command}`,
      body: `Command exited ${gate.exitCode}. Review stdout/stderr tails in the report artifact before trusting the change.`,
      priority: "P1",
      confidence: 1,
      category: "regression",
      code_location: { file_path: "package.json", line: 1 },
      suggested_fix: "Fix the failing gate, rerun it, then rerun autoreview.",
      actionable: true,
    }));
}

function stripInternalFindingFields(finding) {
  const { actionable, ...publicFinding } = finding;
  return publicFinding;
}

function renderMarkdown(report) {
  const findings =
    report.findings.length === 0
      ? "No actionable findings.\n"
      : report.findings
          .map(
            (finding) =>
              `- ${finding.priority} ${finding.title} (${finding.category}, confidence ${finding.confidence})\n  - ${finding.code_location.file_path}:${finding.code_location.line}\n  - ${finding.body}\n  - Suggested fix: ${finding.suggested_fix || "n/a"}`,
          )
          .join("\n");

  const dirtyScope =
    report.dirtyScope.length === 0
      ? "None"
      : report.dirtyScope
          .map((entry) => `- ${entry.status} ${entry.path}`)
          .join("\n");

  const committedScope =
    report.committedScope.length === 0
      ? "None"
      : report.committedScope.map((filePath) => `- ${filePath}`).join("\n");

  const ingestChanged =
    report.ingest.changedFiles.length === 0
      ? "None"
      : report.ingest.changedFiles
          .map((filePath) => `- ${filePath}`)
          .join("\n");

  const siblingScans =
    report.ingest.siblingScans.length === 0
      ? "No ingest sibling scan was required."
      : report.ingest.siblingScans
          .map(
            (scan) =>
              `### ${scan.trigger}\n${scan.siblings
                .map(
                  (sibling) =>
                    `- ${sibling.file_path}:${sibling.line} - ${sibling.reason}`,
                )
                .join("\n")}`,
          )
          .join("\n\n");

  const gates = report.gates
    .map((gate) => {
      if (gate.skipped) return `- skipped: ${gate.reason}`;
      return `- ${gate.exitCode === 0 ? "pass" : "fail"} ${gate.command} (${formatElapsed(gate.durationMs)})`;
    })
    .join("\n");

  return `# Autoreview Report

- Generated: ${report.generatedAt}
- Branch: ${report.branch || "<detached>"}
- Base ref: ${report.baseRef || "<none>"}
- Status: ${report.status}
- Actionable findings: ${report.summary.actionableFindingCount}

## Dirty Scope

${dirtyScope}

## Committed Scope

${committedScope}

## Ingest Changes

${ingestChanged}

${report.ingest.note}

## Sibling Scan

${siblingScans}

## Gates

${gates}

## Findings

${findings}
`;
}

function runGit(cwd, args, options = {}) {
  const result = spawnSyncLike("git", args, cwd);
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `git ${args.join(" ")} failed (${result.status}): ${result.stderr}`,
    );
  }
  return result;
}

function spawnSyncLike(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function startHeartbeat(intervalMs) {
  let currentPhase = "start";
  emitHeartbeat(currentPhase, startedAt);
  const timer = setInterval(() => {
    emitHeartbeat(currentPhase, startedAt);
  }, intervalMs);
  timer.unref?.();
  return {
    setPhase(nextPhase) {
      currentPhase = nextPhase;
      emitHeartbeat(currentPhase, startedAt);
    },
    stop() {
      clearInterval(timer);
    },
  };
}

function emitHeartbeat(phase, start) {
  console.log(
    `autoreview still running: phase=${phase} elapsed=${formatElapsed(Date.now() - start)}`,
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function tail(value, maxChars) {
  if (value.length <= maxChars) return value;
  return value.slice(value.length - maxChars);
}

function formatElapsed(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function formatError(error) {
  return error instanceof Error ? error.stack || error.message : String(error);
}
