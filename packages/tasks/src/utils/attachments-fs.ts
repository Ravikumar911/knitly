import { mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

export function attachmentsRoot() {
  return resolve(process.env.SLASHCASH_ATTACHMENTS_DIR || join(process.env.SLASHCASH_HOME || defaultHome(), "attachments"));
}

export function writeAttachmentFile(input: {
  messageId: string;
  filename: string;
  content: Buffer;
}) {
  const root = attachmentsRoot();
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const ext = extname(input.filename) || ".bin";
  const safeBase = basename(input.messageId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = resolve(root, `${safeBase}${ext}`);
  if (!path.startsWith(`${root}/`) && path !== root) {
    throw new Error("Attachment path escaped root.");
  }
  writeFileSync(path, input.content, { mode: 0o600 });
  return path;
}

function defaultHome() {
  return join(process.env.HOME || process.cwd(), ".slashcash");
}
