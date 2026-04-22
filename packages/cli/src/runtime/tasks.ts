import { accessSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type EmailSyncModule = typeof import("@workspace/tasks/trigger/processEmails");
type ImapClientModule = typeof import("@workspace/tasks/gmail/imap-client");
type ImapErrorsModule = typeof import("@workspace/tasks/utils/imap-errors");

let loadedEmailSync: Promise<EmailSyncModule> | undefined;
let loadedImapClient: Promise<ImapClientModule> | undefined;
let loadedImapErrors: Promise<ImapErrorsModule> | undefined;

export async function loadEmailSync(): Promise<EmailSyncModule> {
  loadedEmailSync ??= loadTasksModule<EmailSyncModule>(
    ["trigger", "processEmails"],
    "@workspace/tasks/trigger/processEmails",
  );
  return loadedEmailSync;
}

export async function loadImapClient(): Promise<ImapClientModule> {
  loadedImapClient ??= loadTasksModule<ImapClientModule>(
    ["gmail", "imap-client"],
    "@workspace/tasks/gmail/imap-client",
  );
  return loadedImapClient;
}

export async function loadImapErrors(): Promise<ImapErrorsModule> {
  loadedImapErrors ??= loadTasksModule<ImapErrorsModule>(
    ["utils", "imap-errors"],
    "@workspace/tasks/utils/imap-errors",
  );
  return loadedImapErrors;
}

function loadTasksModule<T>(segments: string[], specifier: string) {
  return import(
    packagedTasksEntry(segments) ?? workspaceTasksEntry(segments) ?? specifier
  ) as Promise<T>;
}

function packagedTasksEntry(segments: string[]) {
  const here = dirname(fileURLToPath(import.meta.url));
  if (!here.includes(`${sep}dist${sep}`)) return null;

  const candidate = join(
    here,
    "..",
    "app",
    "packages",
    "tasks",
    "dist",
    ...segments,
  ).concat(".js");
  try {
    accessSync(candidate);
    return pathToFileURL(candidate).href;
  } catch {
    return null;
  }
}

function workspaceTasksEntry(segments: string[]) {
  const here = dirname(fileURLToPath(import.meta.url));
  if (here.includes(`${sep}dist${sep}`)) return null;

  const candidate = join(
    here,
    "..",
    "..",
    "..",
    "tasks",
    "src",
    ...segments,
  ).concat(".ts");
  try {
    accessSync(candidate);
    return pathToFileURL(candidate).href;
  } catch {
    return null;
  }
}
