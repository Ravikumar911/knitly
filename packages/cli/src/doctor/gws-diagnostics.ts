import type { CliErrorBlock } from "../errors/format.js";

export type GwsDiagnosticCode =
  | "binary-missing"
  | "not-authenticated"
  | "auth-invalid-client"
  | "auth-access-denied"
  | "auth-redirect-uri-mismatch"
  | "auth-expired"
  | "quota-exceeded"
  | "rate-limited"
  | "unknown";

export type GwsDiagnostic = CliErrorBlock & {
  code: GwsDiagnosticCode;
};

export function classifyGwsDiagnostic(stderr: string): GwsDiagnostic {
  const text = stderr.trim();
  const lower = text.toLowerCase();

  if (lower.includes("invalid_client")) {
    return {
      code: "auth-invalid-client",
      area: "auth",
      symptom: "Google rejected the OAuth client bundled with gws.",
      cause:
        "The installed gws build appears to have a stale or invalid OAuth client configuration.",
      fix: "Run `brew reinstall googleworkspace/tap/gws`, then `gws auth login`.",
      docs: "https://github.com/googleworkspace/gws",
    };
  }

  if (lower.includes("redirect_uri_mismatch")) {
    return {
      code: "auth-redirect-uri-mismatch",
      area: "auth",
      symptom: "Google rejected the gws OAuth redirect URI.",
      cause:
        "The installed gws OAuth client configuration does not match Google's allowed redirect URI.",
      fix: "Run `brew reinstall googleworkspace/tap/gws`, then `gws auth login`.",
      docs: "https://github.com/googleworkspace/gws",
    };
  }

  if (lower.includes("access_denied")) {
    return {
      code: "auth-access-denied",
      area: "auth",
      symptom: "Google denied access to Gmail.",
      cause: "The OAuth flow was cancelled or Gmail access was not granted.",
      fix: "Run `gws auth login` and approve Gmail access.",
    };
  }

  if (lower.includes("expired") || lower.includes("invalid_grant")) {
    return {
      code: "auth-expired",
      area: "auth",
      symptom: "gws authentication has expired.",
      cause: "The stored Google credential is no longer accepted.",
      fix: "Run `gws auth login`.",
    };
  }

  if (lower.includes("resource_exhausted") || lower.includes("quota")) {
    return {
      code: "quota-exceeded",
      area: "network",
      symptom: "Gmail quota was exhausted.",
      cause: "Google returned a quota exhaustion response for this account.",
      fix: "Wait a few minutes, then retry `slashcash sync`.",
    };
  }

  if (lower.includes("429") || lower.includes("rate")) {
    return {
      code: "rate-limited",
      area: "network",
      symptom: "Gmail rate-limited the sync.",
      cause: "Google asked the client to slow down.",
      fix: "Wait a few minutes, then retry `slashcash sync`.",
    };
  }

  if (/auth|credential|login/i.test(text)) {
    return {
      code: "not-authenticated",
      area: "auth",
      symptom: "gws is not authenticated.",
      cause: "The Gmail sync path needs a completed `gws auth login` session.",
      fix: "Run `slashcash onboard` or `gws auth login`.",
    };
  }

  return {
    code: "unknown",
    area: "auth",
    symptom: "gws auth status failed.",
    cause: text.slice(0, 200) || "gws command failed without stderr.",
    fix: "Run `slashcash doctor --fix`, then retry `slashcash sync`.",
  };
}
