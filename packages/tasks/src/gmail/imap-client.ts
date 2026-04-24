import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { ImapFlow } from "imapflow";
import {
  simpleParser,
  type MailAttachment,
  type MailHeaderLine,
} from "mailparser";
import { classifyImapError, type ImapError } from "../utils/imap-errors";

export type ImapMessageRef = {
  id: string;
  threadId: string;
};

export type ParsedImapAttachment = {
  filename: string;
  mimeType: string;
  content: Buffer;
};

export type FetchedImapMessage = {
  id: string;
  threadId: string;
  gmailThreadId: string;
  headers: Array<{ name: string; value: string }>;
  text: string;
  html: string;
  attachments: ParsedImapAttachment[];
  subject: string;
  from: string;
  date: string;
  snippet: string;
  raw: string;
};

export type ImapResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ImapError; message: string };

export async function listMessages(
  query: string,
  maxResults?: number | null,
): Promise<ImapResult<ImapMessageRef[]>> {
  try {
    if (isFixtureMode()) {
      const messages = await listFixtureMessages();
      return {
        ok: true,
        data: maxResults ? messages.slice(0, maxResults) : messages,
      };
    }

    const refs = await withImapClient(async (client) => {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const found = await client.search({ gmraw: query }, { uid: true });
        const uids = found || [];
        if (uids.length === 0) return [];

        const recentUids = maxResults
          ? uids.slice(-maxResults).reverse()
          : [...uids].reverse();
        const fetched = await client.fetchAll(
          recentUids,
          { uid: true, threadId: true },
          { uid: true },
        );

        return fetched.map((message) => ({
          id: String(message.uid),
          threadId: message.threadId || String(message.uid),
        }));
      } finally {
        lock.release();
      }
    });

    return {
      ok: true,
      data: refs,
    };
  } catch (error) {
    const classified = classifyImapError(error);
    return {
      ok: false,
      error: classified,
      message: classified.message,
    };
  }
}

export async function fetchMessage(
  id: string,
): Promise<ImapResult<FetchedImapMessage>> {
  try {
    if (isFixtureMode()) {
      const fixture = await fetchFixtureMessage(id);
      return {
        ok: true,
        data: fixture,
      };
    }

    const message = await withImapClient(async (client) => {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const fetched = await client.fetchOne(
          id,
          {
            uid: true,
            threadId: true,
            internalDate: true,
            source: true,
            envelope: true,
          },
          { uid: true },
        );

        if (!fetched || !fetched.source) {
          throw new Error(`No RFC822 payload found for IMAP uid ${id}.`);
        }

        return toFetchedMessage({
          rawSource: fetched.source,
          id: String(fetched.uid || id),
          threadId: fetched.threadId || String(fetched.uid || id),
          internalDate:
            fetched.internalDate instanceof Date
              ? fetched.internalDate
              : fetched.internalDate
                ? new Date(fetched.internalDate)
                : null,
        });
      } finally {
        lock.release();
      }
    });

    return {
      ok: true,
      data: message,
    };
  } catch (error) {
    const classified = classifyImapError(error);
    return {
      ok: false,
      error: classified,
      message: classified.message,
    };
  }
}

export async function verifyImapLogin(input?: {
  address?: string;
  appPassword?: string;
}): Promise<ImapResult<{ address: string }>> {
  try {
    if (isFixtureMode()) {
      return {
        ok: true,
        data: {
          address:
            input?.address ||
            process.env.SLASHCASH_GMAIL_ADDRESS ||
            "fixture@gmail.com",
        },
      };
    }

    const credentials = resolveCredentials(input);
    await withImapClient(async (client) => {
      const lock = await client.getMailboxLock("INBOX");
      lock.release();
    }, credentials);

    return {
      ok: true,
      data: {
        address: credentials.address,
      },
    };
  } catch (error) {
    const classified = classifyImapError(error);
    return {
      ok: false,
      error: classified,
      message: classified.message,
    };
  }
}

async function withImapClient<T>(
  fn: (client: ImapFlow) => Promise<T>,
  overrideCredentials?: { address: string; appPassword: string },
) {
  const credentials = overrideCredentials || resolveCredentials();
  const { host, port } = resolveImapServer();
  const client = new ImapFlow({
    host,
    port,
    secure: true,
    logger: false,
    auth: {
      user: credentials.address,
      pass: credentials.appPassword,
    },
  });

  try {
    await client.connect();
    return await fn(client);
  } finally {
    try {
      if (client.usable) {
        await client.logout();
      } else {
        client.close();
      }
    } catch {
      client.close();
    }
  }
}

function resolveCredentials(input?: {
  address?: string;
  appPassword?: string;
}) {
  const address = (
    input?.address ||
    process.env.SLASHCASH_GMAIL_ADDRESS ||
    ""
  ).trim();
  const appPassword = (
    input?.appPassword ||
    process.env.SLASHCASH_GMAIL_APP_PASSWORD ||
    ""
  ).replace(/\s+/g, "");

  if (!address || !appPassword) {
    throw new Error("Missing Gmail IMAP credentials.");
  }

  return {
    address,
    appPassword,
  };
}

function resolveImapServer() {
  const raw = process.env.SLASHCASH_IMAP_SERVER || "imap.gmail.com:993";
  const [host, portText] = raw.split(":");
  return {
    host: host || "imap.gmail.com",
    port: Number(portText || "993"),
  };
}

function isFixtureMode() {
  return Boolean(process.env.SLASHCASH_IMAP_FIXTURE_DIR);
}

async function listFixtureMessages() {
  const files = fixtureMessageFiles();
  const messages = await Promise.all(
    files.map(async (file) => {
      const message = await parseFixtureFile(file);
      return {
        id: message.id,
        threadId: message.gmailThreadId,
      };
    }),
  );

  return messages.sort((left, right) => left.id.localeCompare(right.id));
}

async function fetchFixtureMessage(id: string) {
  const files = fixtureMessageFiles();
  for (const file of files) {
    const message = await parseFixtureFile(file);
    if (message.id === id) {
      return message;
    }
  }

  throw new Error(`Fixture IMAP message ${id} was not found.`);
}

function fixtureMessageFiles() {
  const root = process.env.SLASHCASH_IMAP_FIXTURE_DIR;
  if (!root) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".eml"))
    .map((entry) => resolve(join(root, entry.name)))
    .sort();
}

async function parseFixtureFile(path: string) {
  const rawSource = readFileSync(path);
  const parsed = await toFetchedMessage({
    rawSource,
    id: basename(path, ".eml"),
    threadId: basename(path, ".eml"),
    internalDate: null,
  });

  const fixtureId =
    headerValue(parsed.headers, "X-Slashcash-Fixture-Id") || parsed.id;
  const gmailThreadId =
    headerValue(parsed.headers, "X-GM-THRID") || parsed.gmailThreadId;

  return {
    ...parsed,
    id: fixtureId,
    threadId: fixtureId,
    gmailThreadId,
  };
}

async function toFetchedMessage(input: {
  rawSource: Buffer;
  id: string;
  threadId: string;
  internalDate: Date | null;
}): Promise<FetchedImapMessage> {
  const parsed = await simpleParser(input.rawSource);
  const headers =
    parsed.headerLines?.map((header: MailHeaderLine) => ({
      name: header.key,
      value: header.line.replace(/^[^:]+:\s*/, ""),
    })) ?? [];
  const subject = parsed.subject?.trim() || "Swiggy transaction";
  const from =
    parsed.from?.text?.trim() || headerValue(headers, "From") || "unknown";
  const date = (parsed.date || input.internalDate || new Date()).toISOString();
  const text = parsed.text?.trim() || "";
  const html = normalizeHtml(parsed.html);
  const attachments = (parsed.attachments || []).map(
    (attachment: MailAttachment) => ({
      filename: attachment.filename || "attachment.bin",
      mimeType: attachment.contentType || "application/octet-stream",
      content: attachment.content,
    }),
  );
  const snippetSource = [subject, text, html]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: input.id,
    threadId: input.id,
    gmailThreadId: input.threadId,
    headers,
    text,
    html,
    attachments,
    subject,
    from,
    date,
    snippet: snippetSource.slice(0, 240),
    raw: input.rawSource.toString("utf8"),
  };
}

function normalizeHtml(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value) {
    return String(value);
  }
  return "";
}

function headerValue(
  headers: Array<{ name: string; value: string }>,
  name: string,
) {
  return headers.find(
    (candidate) => candidate.name.toLowerCase() === name.toLowerCase(),
  )?.value;
}
