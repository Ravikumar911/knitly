import type { CliErrorBlock } from "../errors/format.js";
import { GWS_GMAIL_LOGIN_COMMAND } from "./gws-status.js";

export type GwsDiagnosticCode =
  | "binary-missing"
  | "not-authenticated"
  | "auth-invalid-client"
  | "auth-access-denied"
  | "auth-invalid-scope"
  | "auth-redirect-uri-mismatch"
  | "auth-expired"
  | "api-not-enabled"
  | "gcloud-missing"
  | "gcloud-not-authenticated"
  | "quota-exceeded"
  | "rate-limited"
  | "unknown";

export type GwsDiagnostic = CliErrorBlock & {
  code: GwsDiagnosticCode;
};

export function classifyGwsDiagnostic(stderr: string): GwsDiagnostic {
  const text = stderr.trim();
  const lower = text.toLowerCase();

  if (
    lower.includes("gcloud: command not found") ||
    lower.includes("gcloud command not found") ||
    lower.includes("no such file or directory: gcloud") ||
    lower.includes("spawn gcloud enoent") ||
    lower.includes("exit code 127")
  ) {
    return {
      code: "gcloud-missing",
      area: "binary",
      symptom: "gcloud is missing from PATH.",
      cause: "slashcash needs gcloud so gws can provision your own Google Cloud OAuth client.",
      fix: "Run `brew install --cask google-cloud-sdk`, then `slashcash onboard`.",
      docs: "https://cloud.google.com/sdk/docs/install",
    };
  }

  if (
    lower.includes("accessnotconfigured") ||
    lower.includes("has not been used in project") ||
    lower.includes("gmail api") && lower.includes("disabled")
  ) {
    return {
      code: "api-not-enabled",
      area: "auth",
      symptom: "The Gmail API is not enabled for your Google Cloud project.",
      cause: "The project created for gws does not currently allow Gmail API calls.",
      fix: "Run `gws auth setup`, then retry `slashcash sync`.",
      docs: "https://github.com/googleworkspace/gws",
    };
  }

  if (
    lower.includes("reauthentication is needed") ||
    lower.includes("no credentialed accounts") ||
    lower.includes("you do not currently have an active account")
  ) {
    return {
      code: "gcloud-not-authenticated",
      area: "auth",
      symptom: "gcloud is not authenticated.",
      cause: "gws auth setup needs an active gcloud account before it can create the OAuth client.",
      fix: "Run `gcloud auth login --brief --no-update-adc`, then `slashcash onboard`.",
    };
  }

  if (lower.includes("invalid_client")) {
    return {
      code: "auth-invalid-client",
      area: "auth",
      symptom: "Google rejected the OAuth client created for gws.",
      cause:
        "The local gws client secret is stale, missing or invalid for this machine.",
      fix: `Run \`gws auth setup\`, then \`${GWS_GMAIL_LOGIN_COMMAND}\`.`,
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
      fix: `Run \`gws auth setup\`, then \`${GWS_GMAIL_LOGIN_COMMAND}\`.`,
      docs: "https://github.com/googleworkspace/gws",
    };
  }

  if (lower.includes("invalid_scope")) {
    return {
      code: "auth-invalid-scope",
      area: "auth",
      symptom: "Google rejected one of the requested OAuth scopes.",
      cause:
        "The login flow requested a scope Google does not accept for this OAuth client.",
      fix: `Run \`${GWS_GMAIL_LOGIN_COMMAND}\` and approve Gmail read-only access.`,
    };
  }

  if (lower.includes("access_denied")) {
    return {
      code: "auth-access-denied",
      area: "auth",
      symptom: "Google denied access to Gmail.",
      cause: "The OAuth flow was cancelled or Gmail access was not granted.",
      fix: `Run \`${GWS_GMAIL_LOGIN_COMMAND}\` and approve Gmail access.`,
    };
  }

  if (lower.includes("expired") || lower.includes("invalid_grant")) {
    return {
      code: "auth-expired",
      area: "auth",
      symptom: "gws authentication has expired.",
      cause: "The stored Google credential is no longer accepted.",
      fix: `Run \`${GWS_GMAIL_LOGIN_COMMAND}\`.`,
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
      fix: `Run \`slashcash onboard\` or \`${GWS_GMAIL_LOGIN_COMMAND}\`.`,
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
