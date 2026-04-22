import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fetchMessage, listMessages, verifyImapLogin } from "./imap-client";

const fixtureDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "e2e-tests",
  "fixtures",
  "imap",
);

describe("imap client fixture mode", () => {
  const previousFixtureDir = process.env.SLASHCASH_IMAP_FIXTURE_DIR;

  beforeEach(() => {
    process.env.SLASHCASH_IMAP_FIXTURE_DIR = fixtureDir;
  });

  afterEach(() => {
    if (previousFixtureDir === undefined) {
      delete process.env.SLASHCASH_IMAP_FIXTURE_DIR;
    } else {
      process.env.SLASHCASH_IMAP_FIXTURE_DIR = previousFixtureDir;
    }
  });

  it("lists IMAP fixture messages", async () => {
    const result = await listMessages("from:(swiggy.in) newer_than:365d", 10);

    expect(result).toMatchObject({
      ok: true,
      data: [
        {
          id: "fixture-msg-1",
          threadId: "fixture-thread-1",
        },
      ],
    });
  });

  it("fetches a parsed RFC822 message with attachments", async () => {
    const result = await fetchMessage("fixture-msg-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.subject).toBe("Swiggy order SWG-TEST-12345 delivered");
    expect(result.data.from).toContain("orders@swiggy.in");
    expect(result.data.text).toContain("Millet Bowl Co");
    expect(result.data.gmailThreadId).toBe("fixture-thread-1");
    expect(result.data.attachments).toHaveLength(1);
    expect(result.data.attachments[0]).toMatchObject({
      filename: "swiggy-invoice-fixture.pdf",
      mimeType: "application/pdf",
    });
  });

  it("treats fixture mode as a successful IMAP login", async () => {
    const result = await verifyImapLogin({
      address: "fixture@gmail.com",
      appPassword: "abcd efgh ijkl mnop",
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        address: "fixture@gmail.com",
      },
    });
  });
});
