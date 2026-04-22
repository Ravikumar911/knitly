import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  binaryMissingGwsError,
  classifyGwsError,
  invalidJsonGwsError,
  type GwsError,
} from "./gws-errors";

export type GwsResult<T> = { ok: true; data: T } | ({ ok: false } & GwsError);
export type GwsCommandRunner = (
  args: string[],
) => Pick<SpawnSyncReturns<string>, "error" | "status" | "stderr" | "stdout">;

export type GwsClientOptions = {
  fixtureDir?: string;
  runCommand?: GwsCommandRunner;
};

const messageRefSchema = z.object({
  id: z.string(),
  threadId: z.string().optional(),
});

const listMessagesSchema = z.union([
  z.object({
    messages: z.array(messageRefSchema).default([]),
    nextPageToken: z.string().optional(),
  }),
  z.array(messageRefSchema),
]);

const headerSchema = z.object({
  name: z.string(),
  value: z.string(),
});

const bodySchema = z
  .object({
    data: z.string().optional(),
    size: z.number().optional(),
    attachmentId: z.string().optional(),
  })
  .passthrough();

const partSchema: z.ZodType<GwsMessagePart> = z.lazy(() =>
  z
    .object({
      partId: z.string().optional(),
      mimeType: z.string().optional(),
      filename: z.string().optional(),
      headers: z.array(headerSchema).optional(),
      body: bodySchema.optional(),
      parts: z.array(partSchema).optional(),
    })
    .passthrough(),
);

const messageSchema = z
  .object({
    id: z.string(),
    threadId: z.string().optional(),
    snippet: z.string().optional(),
    internalDate: z.string().optional(),
    payload: partSchema.optional(),
  })
  .passthrough();

const attachmentSchema = z
  .object({
    data: z.string(),
    size: z.number().optional(),
  })
  .passthrough();

export type GwsMessagePart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GwsMessagePart[];
};

export type GwsMessage = z.infer<typeof messageSchema>;
export type GwsMessageRef = z.infer<typeof messageRefSchema>;

export function listGmailMessages(
  query: string,
  maxResults: number,
): GwsResult<GwsMessageRef[]> {
  return createGwsClient().listGmailMessages(query, maxResults);
}

export function getGmailMessage(id: string): GwsResult<GwsMessage> {
  return createGwsClient().getGmailMessage(id);
}

export function getGmailAttachment(
  messageId: string,
  attachmentId: string,
): GwsResult<Buffer> {
  return createGwsClient().getGmailAttachment(messageId, attachmentId);
}

export function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function parseList(value: string): GwsResult<GwsMessageRef[]> {
  const parsed = parseJson(value, listMessagesSchema);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    data: Array.isArray(parsed.data)
      ? parsed.data
      : (parsed.data.messages ?? []),
  };
}

function parseJson<T>(value: string, schema: z.ZodType<T>): GwsResult<T> {
  try {
    const raw = JSON.parse(value) as unknown;
    return { ok: true, data: schema.parse(raw) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, ...invalidJsonGwsError(message) };
  }
}

export function createGwsClient(options: GwsClientOptions = {}) {
  const run = options.runCommand ?? runGwsCommand;

  return {
    listGmailMessages(
      query: string,
      maxResults: number,
    ): GwsResult<GwsMessageRef[]> {
      const fixture = readFixture(options.fixtureDir, "messages.json");
      if (fixture) {
        return parseList(fixture);
      }

      const result = runGws(run, [
        "gmail",
        "users",
        "messages",
        "list",
        "--format",
        "json",
        "--params",
        JSON.stringify({ userId: "me", q: query, maxResults }),
      ]);

      if (!result.ok) return result;
      return parseList(result.data.stdout);
    },

    getGmailMessage(id: string): GwsResult<GwsMessage> {
      const fixture = readFixture(options.fixtureDir, `${id}.json`);
      if (fixture) {
        return parseJson(fixture, messageSchema);
      }

      const result = runGws(run, [
        "gmail",
        "users",
        "messages",
        "get",
        "--format",
        "json",
        "--params",
        JSON.stringify({ userId: "me", id, format: "full" }),
      ]);

      if (!result.ok) return result;
      return parseJson(result.data.stdout, messageSchema);
    },

    getGmailAttachment(
      messageId: string,
      attachmentId: string,
    ): GwsResult<Buffer> {
      const fixture = readFixture(
        options.fixtureDir,
        `${messageId}-${attachmentId}.json`,
      );
      if (fixture) {
        const parsed = parseJson(fixture, attachmentSchema);
        return parsed.ok
          ? { ok: true, data: decodeBase64Url(parsed.data.data) }
          : parsed;
      }

      const result = runGws(run, [
        "gmail",
        "users",
        "messages",
        "attachments",
        "get",
        "--format",
        "json",
        "--params",
        JSON.stringify({ userId: "me", messageId, id: attachmentId }),
      ]);

      if (!result.ok) return result;
      const parsed = parseJson(result.data.stdout, attachmentSchema);
      return parsed.ok
        ? { ok: true, data: decodeBase64Url(parsed.data.data) }
        : parsed;
    },
  };
}

function runGwsCommand(args: string[]) {
  return spawnSync("gws", args, {
    encoding: "utf8",
    timeout: 60_000,
  });
}

function runGws(
  runCommand: GwsCommandRunner,
  args: string[],
): GwsResult<{ stdout: string }> {
  const result = runCommand(args);
  if (
    result.error &&
    "code" in result.error &&
    result.error.code === "ENOENT"
  ) {
    return { ok: false, ...binaryMissingGwsError() };
  }

  if (result.status === 0) {
    return { ok: true, data: { stdout: result.stdout ?? "" } };
  }

  const stderr = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  return { ok: false, ...classifyGwsError(stderr) };
}

function readFixture(fixtureDir: string | undefined, name: string) {
  const root = fixtureDir ?? process.env.SLASHCASH_GWS_FIXTURE_DIR;
  if (!root) return null;
  const path = join(root, name);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}
