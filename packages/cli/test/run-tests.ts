import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyGwsDiagnostic } from "../src/doctor/gws-diagnostics.js";
import { formatCliError } from "../src/errors/format.js";
import { readLogEvents, writeLog } from "../src/runtime/log.js";
import { testPrivacyCopySnapshots } from "./privacy.spec.js";

function testCliErrorFormatting() {
  const block = formatCliError({
    area: "auth",
    symptom: "OAuth failed.",
    cause: "Google rejected the client.",
    fix: "Run `gws auth login`.",
  });

  assert.equal(
    block,
    [
      "error[auth]: OAuth failed.",
      "  cause: Google rejected the client.",
      "  fix:   Run `gws auth login`.",
    ].join("\n"),
  );
}

function testGwsDiagnostic() {
  const diagnostic = classifyGwsDiagnostic(
    '{"error":"invalid_client","message":"The provided client secret is invalid."}',
  );
  assert.equal(diagnostic.code, "auth-invalid-client");
  assert.match(diagnostic.fix, /gws auth setup/);

  const apiDiagnostic = classifyGwsDiagnostic(
    "accessNotConfigured: Gmail API has not been used in project 123 before or it is disabled.",
  );
  assert.equal(apiDiagnostic.code, "api-not-enabled");

  const gcloudDiagnostic = classifyGwsDiagnostic("gcloud: command not found");
  assert.equal(gcloudDiagnostic.code, "gcloud-missing");
}

function testStructuredLogs() {
  const home = mkdtempSync(join(tmpdir(), "slashcash-cli-test-"));
  const previousHome = process.env.SLASHCASH_HOME;
  process.env.SLASHCASH_HOME = home;

  try {
    writeLog("cron", {
      event: "tick",
      skillId: "gmail-swiggy",
      durationMs: 12,
    });
    const events = readLogEvents({ areas: ["cron"], tail: 1 });
    assert.equal(events.length, 1);
    assert.equal(events[0]!.area, "cron");
    assert.equal(events[0]!.msg, "tick");
    assert.equal(events[0]!.durationMs, 12);
  } finally {
    if (previousHome) {
      process.env.SLASHCASH_HOME = previousHome;
    } else {
      delete process.env.SLASHCASH_HOME;
    }
    rmSync(home, { recursive: true, force: true });
  }
}

testCliErrorFormatting();
testGwsDiagnostic();
testStructuredLogs();
testPrivacyCopySnapshots();
console.log("cli tests passed");
