/**
 * Sync the address bar to `/assistant/:chatId` without a Next.js navigation, so
 * the chat component does not remount and streaming state is preserved.
 */
export const ASSISTANT_PATH_EVENT = "assistant:path" as const;

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

export function isAssistantLandingPath(pathname: string) {
  return normalizePath(pathname) === "/assistant";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

/**
 * When the app is on `/assistant` (new chat) and a thread id is known, set the
 * URL to `/assistant/:chatId` via `history.replaceState` and notify listeners.
 * Returns `true` if the URL was updated (or already matched).
 */
export function syncAssistantUrlToChatId(chatId: string): boolean {
  if (typeof window === "undefined") return false;
  if (!isUuid(chatId)) return false;
  if (!isAssistantLandingPath(window.location.pathname)) return false;
  const next = `/assistant/${chatId}`;
  if (window.location.pathname === next) {
    return true;
  }
  window.history.replaceState(null, "", next);
  window.dispatchEvent(new Event(ASSISTANT_PATH_EVENT));
  return true;
}
