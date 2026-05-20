import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  initializeSync: vi.fn(),
  markSyncComplete: vi.fn(),
  markSyncCountingEmails: vi.fn(),
  markSyncFailed: vi.fn(),
  markSyncFailedWithOAuthError: vi.fn(),
  storeEmailData: vi.fn(),
  updateEmailData: vi.fn(),
  updateSyncProgress: vi.fn(),
  getProcessedEmailIds: vi.fn(),
  storeTransactionV2Input: vi.fn(),
  listMessages: vi.fn(),
  fetchMessage: vi.fn(),
  extractTransactionFromEmail: vi.fn(),
  runSingleFlight: vi.fn(),
  writeAttachmentFile: vi.fn(),
}));

vi.mock("@workspace/database", () => ({
  initializeSync: mocks.initializeSync,
  markSyncComplete: mocks.markSyncComplete,
  markSyncCountingEmails: mocks.markSyncCountingEmails,
  markSyncFailed: mocks.markSyncFailed,
  markSyncFailedWithOAuthError: mocks.markSyncFailedWithOAuthError,
  storeEmailData: mocks.storeEmailData,
  updateEmailData: mocks.updateEmailData,
  updateSyncProgress: mocks.updateSyncProgress,
  getProcessedEmailIds: mocks.getProcessedEmailIds,
  storeTransactionV2Input: mocks.storeTransactionV2Input,
  dbPath: ":memory:",
}));

vi.mock("../gmail/imap-client", () => ({
  listMessages: mocks.listMessages,
  fetchMessage: mocks.fetchMessage,
}));

vi.mock("../extract/pipeline", () => ({
  extractTransactionFromEmail: mocks.extractTransactionFromEmail,
}));

vi.mock("../runtime/mutex", () => ({
  runSingleFlight: mocks.runSingleFlight,
}));

vi.mock("../utils/attachments-fs", () => ({
  writeAttachmentFile: mocks.writeAttachmentFile,
}));

import { runEmailSync } from "./processEmails";

describe("runEmailSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runSingleFlight.mockImplementation(
      async (fn: () => Promise<unknown>) => ({
        status: "ran",
        value: await fn(),
      }),
    );
    mocks.getProcessedEmailIds.mockResolvedValue(new Set());
    mocks.storeEmailData.mockResolvedValue([{ id: "msg-1" }]);
    mocks.updateEmailData.mockResolvedValue([]);
    mocks.storeTransactionV2Input.mockResolvedValue({ id: "txn-1" });
    mocks.writeAttachmentFile.mockReturnValue("/tmp/invoice.pdf");
  });

  it("classifies non-transactional Swiggy mail as skipped without an error", async () => {
    mocks.listMessages.mockResolvedValue({
      ok: true,
      data: [{ id: "msg-1", threadId: "thread-1" }],
    });
    mocks.fetchMessage.mockResolvedValue({
      ok: true,
      data: fetchedMessage("msg-1", "20% off this weekend"),
    });
    mocks.extractTransactionFromEmail.mockResolvedValue({
      parseSuccess: false,
      parseErrors: ["No completed Swiggy transaction was found."],
      warnings: [],
      schemaUsed: "swiggy.fallback.v1",
      dataSource: "EMAIL_BODY",
      contributedByPdf: false,
      extractionConfidence: 0,
      provenance: null,
      extractionData: { parseSuccess: false },
    });

    const result = await runEmailSync({ userId: "local-user-id", full: true });

    expect(result.counts).toMatchObject({
      processed: 0,
      skipped_non_transaction: 1,
      failed: 0,
    });
    expect(mocks.markSyncComplete).toHaveBeenCalledWith("local-user-id");
    expect(mocks.storeTransactionV2Input).not.toHaveBeenCalled();
    expect(mocks.storeEmailData).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "msg-1",
        threadId: "thread-1",
      }),
    );
    expect(mocks.updateEmailData).toHaveBeenCalledWith("msg-1", {
      parseSuccess: true,
      parseErrors: null,
    });
  });

  it("keeps technical extraction failures retryable instead of marking them as skips", async () => {
    mocks.listMessages.mockResolvedValue({
      ok: true,
      data: [{ id: "msg-1", threadId: "thread-1" }],
    });
    mocks.fetchMessage.mockResolvedValue({
      ok: true,
      data: fetchedMessage("msg-1", "Your Swiggy order was delivered"),
    });
    mocks.extractTransactionFromEmail.mockResolvedValue({
      parseSuccess: false,
      parseErrors: [
        "response_format.json_schema.schema: For 'number' type, properties maximum, minimum are not supported",
      ],
      warnings: [],
      schemaUsed: "swiggy.fallback.v1",
      dataSource: "EMAIL_BODY",
      contributedByPdf: false,
      extractionConfidence: 0,
      provenance: null,
      extractionData: { parseSuccess: false },
    });

    const result = await runEmailSync({ userId: "local-user-id", full: true });

    expect(result.counts).toMatchObject({
      processed: 0,
      skipped_non_transaction: 0,
      failed: 1,
    });
    expect(mocks.markSyncFailed).toHaveBeenCalledWith(
      "local-user-id",
      "1 messages failed to process.",
    );
    expect(mocks.storeTransactionV2Input).not.toHaveBeenCalled();
    expect(mocks.updateEmailData).toHaveBeenCalledWith("msg-1", {
      parseSuccess: false,
      parseErrors: JSON.stringify([
        "response_format.json_schema.schema: For 'number' type, properties maximum, minimum are not supported",
      ]),
    });
  });

  it("reprocesses previously stored messages when reextract is enabled", async () => {
    mocks.listMessages.mockResolvedValue({
      ok: true,
      data: [{ id: "msg-1", threadId: "thread-1" }],
    });
    mocks.getProcessedEmailIds.mockResolvedValue(new Set(["msg-1"]));
    mocks.fetchMessage.mockResolvedValue({
      ok: true,
      data: fetchedMessage("msg-1", "Your Swiggy order was delivered"),
    });
    mocks.extractTransactionFromEmail.mockResolvedValue({
      parseSuccess: true,
      parseErrors: [],
      warnings: [],
      schemaUsed: "swiggy.llm.v1",
      dataSource: "BOTH",
      contributedByPdf: true,
      extractionConfidence: 0.95,
      provenance: null,
      extractionData: {
        parseSuccess: true,
        transaction: {
          amount: 208,
          orderId: "236403526545349",
          referenceIds: { orderId: "236403526545349" },
        },
      },
    });

    const result = await runEmailSync({
      userId: "local-user-id",
      full: true,
      reextract: true,
    });

    expect(result.counts).toMatchObject({
      processed: 1,
      skipped_existing: 0,
      failed: 0,
    });
    expect(mocks.getProcessedEmailIds).not.toHaveBeenCalled();
    expect(mocks.storeTransactionV2Input).toHaveBeenCalled();
  });

  it("stores each processed message without waiting for every fetch to finish", async () => {
    const slowFetch = deferred<ReturnType<typeof okFetchedMessage>>();
    mocks.listMessages.mockResolvedValue({
      ok: true,
      data: [
        { id: "msg-1", threadId: "thread-1" },
        { id: "msg-2", threadId: "thread-2" },
      ],
    });
    mocks.fetchMessage.mockImplementation((id: string) => {
      if (id === "msg-1") {
        return Promise.resolve(okFetchedMessage("msg-1", "First order"));
      }
      return slowFetch.promise;
    });
    mocks.extractTransactionFromEmail.mockResolvedValue({
      parseSuccess: false,
      parseErrors: ["No completed Swiggy transaction was found."],
      warnings: [],
      schemaUsed: "swiggy.fallback.v1",
      dataSource: "EMAIL_BODY",
      contributedByPdf: false,
      extractionConfidence: 0,
      provenance: null,
      extractionData: { parseSuccess: false },
    });

    const run = runEmailSync({ userId: "local-user-id", full: true });

    await waitFor(() => {
      expect(mocks.storeEmailData).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "msg-1",
          threadId: "thread-1",
        }),
      );
      expect(mocks.updateSyncProgress).toHaveBeenCalledTimes(1);
    });

    slowFetch.resolve(okFetchedMessage("msg-2", "Second order"));

    await expect(run).resolves.toMatchObject({
      counts: {
        processed: 0,
        skipped_existing: 0,
        skipped_non_transaction: 2,
        failed: 0,
      },
    });
    expect(mocks.updateSyncProgress).toHaveBeenCalledTimes(2);
  });
});

function fetchedMessage(id: string, subject: string) {
  return {
    id,
    threadId: id,
    gmailThreadId: id,
    headers: [],
    text: "Promotional email",
    html: "",
    attachments: [],
    subject,
    from: "offers@swiggy.in",
    date: "2026-04-22T00:00:00.000Z",
    snippet: subject,
    raw: subject,
  };
}

function okFetchedMessage(id: string, subject: string) {
  return {
    ok: true as const,
    data: fetchedMessage(id, subject),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

async function waitFor(assertion: () => void) {
  const deadline = Date.now() + 1_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  throw lastError;
}
