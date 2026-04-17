import assert from "node:assert/strict";
import { runSingleFlight } from "../src/runtime/mutex.js";
import { classifyGwsError } from "../src/utils/gws-errors.js";

async function testSingleFlight() {
  let release!: () => void;
  const first = runSingleFlight(
    () =>
      new Promise<string>((resolve) => {
        release = () => resolve("done");
      }),
    "unit-test",
  );
  const second = await runSingleFlight(async () => "unexpected", "unit-test");
  release();

  assert.deepEqual(second, { status: "skipped", reason: "busy" });
  assert.deepEqual(await first, { status: "ran", value: "done" });
}

function testGwsClassifier() {
  assert.equal(classifyGwsError("invalid_client").code, "auth-invalid-client");
  assert.equal(classifyGwsError("access_denied").code, "auth-access-denied");
  assert.equal(
    classifyGwsError("redirect_uri_mismatch").code,
    "auth-redirect-uri-mismatch",
  );
  assert.equal(classifyGwsError("429 too many requests").code, "rate-limited");
}

async function main() {
  await testSingleFlight();
  testGwsClassifier();
  console.log("tasks tests passed");
}

void main();
