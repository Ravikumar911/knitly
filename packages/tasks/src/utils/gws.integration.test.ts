import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createGwsClient, type GwsCommandRunner } from "./gws.js";
import type { GwsErrorCode } from "./gws-errors.js";

const fixtureDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../e2e-tests/fixtures/gws",
);

describe("gws wrapper integration", () => {
  it("parses recorded Gmail list, message, and attachment fixtures", () => {
    const client = createGwsClient({ fixtureDir });

    const listed = client.listGmailMessages("from:(swiggy.in)", 10);
    expect(listed).toEqual({
      ok: true,
      data: [{ id: "fixture-msg-1", threadId: "fixture-thread-1" }],
    });

    const message = client.getGmailMessage("fixture-msg-1");
    expect(message.ok).toBe(true);
    if (!message.ok) throw new Error(message.message);
    expect(message.data.payload?.parts?.[1]?.body?.attachmentId).toBe(
      "invoice-1",
    );

    const attachment = client.getGmailAttachment("fixture-msg-1", "invoice-1");
    expect(attachment.ok).toBe(true);
    if (!attachment.ok) throw new Error(attachment.message);
    expect(attachment.data.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("parses successful command stdout without invoking real gws", () => {
    const calls: string[][] = [];
    const client = createGwsClient({
      runCommand(args) {
        calls.push(args);
        return {
          status: 0,
          stdout: JSON.stringify({
            messages: [{ id: "cmd-msg-1", threadId: "cmd-thread-1" }],
          }),
          stderr: "",
        };
      },
    });

    expect(client.listGmailMessages("query", 1)).toEqual({
      ok: true,
      data: [{ id: "cmd-msg-1", threadId: "cmd-thread-1" }],
    });
    expect(calls[0]).toContain("gmail");
    expect(calls[0]).toContain("--format");
    expect(calls[0]).toContain("json");
  });

  it("makes every documented gws error code reachable without real gws", () => {
    const reached = new Set<GwsErrorCode>();

    for (const [stderr, code] of stderrCases) {
      expectFailure(stderrRunner(stderr), code, reached);
    }

    const enoent = new Error("spawn gws ENOENT") as Error & { code: string };
    enoent.code = "ENOENT";
    expectFailure(
      () => ({ error: enoent, status: null, stderr: "", stdout: "" }),
      "binary-missing",
      reached,
    );

    expectFailure(
      () => ({ status: 0, stderr: "", stdout: "{not json" }),
      "invalid-json",
      reached,
    );

    expect([...reached].sort()).toEqual([...expectedCodes].sort());
  });
});

const stderrCases = [
  ["auth login required", "not-authenticated"],
  ['{"error":"invalid_client"}', "auth-invalid-client"],
  ["access_denied", "auth-access-denied"],
  ["invalid_scope invalid=[gmail.readonly]", "auth-invalid-scope"],
  ["redirect_uri_mismatch", "auth-redirect-uri-mismatch"],
  ["invalid_grant", "auth-expired"],
  [
    "accessNotConfigured: Gmail API has not been used in project 123 before or it is disabled.",
    "api-not-enabled",
  ],
  ["gcloud: command not found", "gcloud-missing"],
  [
    "You do not currently have an active account selected.",
    "gcloud-not-authenticated",
  ],
  ["RESOURCE_EXHAUSTED quota exceeded", "quota-exceeded"],
  ["429 too many requests", "rate-limited"],
  ["a brand new gws failure shape", "unknown"],
] satisfies Array<[string, GwsErrorCode]>;

const expectedCodes = [
  "binary-missing",
  "not-authenticated",
  "auth-invalid-client",
  "auth-access-denied",
  "auth-invalid-scope",
  "auth-redirect-uri-mismatch",
  "auth-expired",
  "api-not-enabled",
  "gcloud-missing",
  "gcloud-not-authenticated",
  "quota-exceeded",
  "rate-limited",
  "invalid-json",
  "unknown",
] satisfies GwsErrorCode[];

function stderrRunner(stderr: string): GwsCommandRunner {
  return () => ({ status: 1, stderr, stdout: "" });
}

function expectFailure(
  runCommand: GwsCommandRunner,
  code: GwsErrorCode,
  reached: Set<GwsErrorCode>,
) {
  const result = createGwsClient({ runCommand }).listGmailMessages("query", 1);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected gws command to fail.");
  expect(result.code).toBe(code);
  reached.add(result.code);
}
