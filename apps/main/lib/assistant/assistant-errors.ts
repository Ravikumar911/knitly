/**
 * True when the stream failed because the assistant provider is not configured
 * (HTTP 409 from POST /api/assistant/stream).
 */
export function isAssistantConfigureError(err: unknown): boolean {
  if (err == null) return false;
  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (o.statusCode === 409 || o.status === 409) return true;
    const c = o.cause;
    if (typeof c === "object" && c !== null) {
      const c2 = c as Record<string, unknown>;
      if (c2.statusCode === 409 || c2.status === 409) return true;
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.toLowerCase().includes("configure an assistant")) return true;
  if (msg.includes("409") && /configure|provider/i.test(msg)) return true;
  return false;
}
