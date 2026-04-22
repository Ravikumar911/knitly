import { accessSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type EmailSyncModule = typeof import("@workspace/tasks/trigger/processEmails");

let loadedEmailSync: Promise<EmailSyncModule> | undefined;

export async function loadEmailSync(): Promise<EmailSyncModule> {
  loadedEmailSync ??= import(
    packagedTasksEntry() ??
      workspaceTasksEntry() ??
      "@workspace/tasks/trigger/processEmails"
  ) as Promise<EmailSyncModule>;
  return loadedEmailSync;
}

function packagedTasksEntry() {
  const here = dirname(fileURLToPath(import.meta.url));
  if (!here.includes(`${sep}dist${sep}`)) return null;

  const candidate = join(here, "..", "app", "packages", "tasks", "dist", "trigger", "processEmails.js");
  try {
    accessSync(candidate);
    return pathToFileURL(candidate).href;
  } catch {
    return null;
  }
}

function workspaceTasksEntry() {
  const here = dirname(fileURLToPath(import.meta.url));
  if (here.includes(`${sep}dist${sep}`)) return null;

  const candidate = join(
    here,
    "..",
    "..",
    "..",
    "tasks",
    "src",
    "trigger",
    "processEmails.ts",
  );
  try {
    accessSync(candidate);
    return pathToFileURL(candidate).href;
  } catch {
    return null;
  }
}
