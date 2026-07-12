import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { attachmentsRoot, writeAttachmentFile } from "./attachments-fs";

describe("attachments fs", () => {
  const originalAttachmentsDir = process.env.SLASHCASH_ATTACHMENTS_DIR;
  const roots: string[] = [];

  afterEach(() => {
    if (originalAttachmentsDir === undefined) {
      delete process.env.SLASHCASH_ATTACHMENTS_DIR;
    } else {
      process.env.SLASHCASH_ATTACHMENTS_DIR = originalAttachmentsDir;
    }

    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("writes attachments inside the configured root", () => {
    const root = tempRoot();
    process.env.SLASHCASH_ATTACHMENTS_DIR = root;

    const path = writeAttachmentFile({
      messageId: "order-123",
      filename: "invoice.pdf",
      content: Buffer.from("receipt"),
    });

    expect(attachmentsRoot()).toBe(root);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf8")).toBe("receipt");
    expect(relative(root, path)).toBe("order-123.pdf");
  });

  it("sanitizes path-shaped message ids before writing", () => {
    const root = tempRoot();
    process.env.SLASHCASH_ATTACHMENTS_DIR = root;

    const path = writeAttachmentFile({
      messageId: "../merchant/../../order:456",
      filename: "invoice",
      content: Buffer.from("receipt"),
    });

    expect(relative(root, path).startsWith("..")).toBe(false);
    expect(basename(path)).toBe("order_456.bin");
  });

  function tempRoot() {
    const root = mkdtempSync(join(tmpdir(), "slashcash-attachments-"));
    roots.push(root);
    return root;
  }
});
