export type GwsErrorCode =
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
  | "invalid-json"
  | "unknown";

export type GwsError = {
  code: GwsErrorCode;
  symptom: string;
  cause: string;
  fix: string;
  docsUrl?: string;
  message: string;
};

const GWS_GMAIL_LOGIN_COMMAND = "gws auth login --services gmail --readonly";

export function invalidJsonGwsError(message: string): GwsError {
  return {
    code: "invalid-json",
    symptom: "gws returned JSON that slashcash could not read.",
    cause: message,
    fix: "Run `slashcash doctor --fix`, then retry the sync.",
    message: `gws JSON parse failed: ${message}`,
  };
}

export function binaryMissingGwsError(): GwsError {
  return {
    code: "binary-missing",
    symptom: "gws is not installed or not on PATH.",
    cause: "The Gmail sync path shells out to the Google Workspace CLI.",
    fix: "Run `slashcash onboard` or `brew install googleworkspace-cli`.",
    docsUrl: "https://github.com/googleworkspace/gws",
    message: "gws is not installed or not on PATH.",
  };
}

export function classifyGwsError(stderr: string): GwsError {
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
      symptom: "gcloud is missing from PATH.",
      cause:
        "slashcash needs gcloud so gws can provision your own Google Cloud OAuth client.",
      fix: "Run `brew install --cask google-cloud-sdk`, then `slashcash onboard`.",
      docsUrl: "https://cloud.google.com/sdk/docs/install",
      message: "gcloud is missing from PATH.",
    };
  }

  if (
    lower.includes("accessnotconfigured") ||
    lower.includes("has not been used in project") ||
    (lower.includes("gmail api") && lower.includes("disabled"))
  ) {
    return {
      code: "api-not-enabled",
      symptom: "The Gmail API is not enabled for your Google Cloud project.",
      cause:
        "The project created for gws does not currently allow Gmail API calls.",
      fix: "Run `gws auth setup`, then retry `slashcash sync`.",
      docsUrl: "https://github.com/googleworkspace/gws",
      message: "The Gmail API is not enabled for the gws project.",
    };
  }

  if (
    lower.includes("reauthentication is needed") ||
    lower.includes("no credentialed accounts") ||
    lower.includes("you do not currently have an active account")
  ) {
    return {
      code: "gcloud-not-authenticated",
      symptom: "gcloud is not authenticated.",
      cause:
        "gws auth setup needs an active gcloud account before it can create the OAuth client.",
      fix: "Run `gcloud auth login --brief --no-update-adc`, then `slashcash onboard`.",
      message: "gcloud is not authenticated.",
    };
  }

  if (lower.includes("invalid_client")) {
    return {
      code: "auth-invalid-client",
      symptom: "Google rejected the OAuth client bundled with gws.",
      cause:
        "The installed gws build appears to have a stale or invalid OAuth client configuration.",
      fix: `Run \`gws auth setup\`, then \`${GWS_GMAIL_LOGIN_COMMAND}\`.`,
      docsUrl: "https://github.com/googleworkspace/gws",
      message:
        "gws OAuth client is invalid. Run gws setup and authenticate again.",
    };
  }

  if (lower.includes("redirect_uri_mismatch")) {
    return {
      code: "auth-redirect-uri-mismatch",
      symptom: "Google rejected the gws OAuth redirect URI.",
      cause:
        "The installed gws OAuth client configuration does not match Google's allowed redirect URI.",
      fix: `Run \`gws auth setup\`, then \`${GWS_GMAIL_LOGIN_COMMAND}\`.`,
      docsUrl: "https://github.com/googleworkspace/gws",
      message:
        "gws OAuth redirect URI is mismatched. Run gws setup and authenticate again.",
    };
  }

  if (lower.includes("access_denied")) {
    return {
      code: "auth-access-denied",
      symptom: "Google denied access to Gmail.",
      cause:
        "The OAuth flow was cancelled or the account did not grant the requested Gmail access.",
      fix: `Run \`${GWS_GMAIL_LOGIN_COMMAND}\` and approve Gmail access for the account you want to use.`,
      message: "gws authentication was denied. Run gws auth login again.",
    };
  }

  if (lower.includes("invalid_scope")) {
    return {
      code: "auth-invalid-scope",
      symptom: "Google rejected one of the requested OAuth scopes.",
      cause:
        "The login flow requested a scope Google does not accept for this OAuth client.",
      fix: `Run \`${GWS_GMAIL_LOGIN_COMMAND}\` and approve Gmail read-only access.`,
      message: "gws requested an invalid OAuth scope. Run gws auth login again.",
    };
  }

  if (lower.includes("expired") || lower.includes("invalid_grant")) {
    return {
      code: "auth-expired",
      symptom: "gws authentication has expired.",
      cause: "The stored Google credential is no longer accepted.",
      fix: `Run \`${GWS_GMAIL_LOGIN_COMMAND}\`.`,
      message: "gws authentication has expired. Run gws auth login.",
    };
  }

  if (lower.includes("resource_exhausted") || lower.includes("quota")) {
    return {
      code: "quota-exceeded",
      symptom: "Gmail quota was exhausted.",
      cause:
        "Google returned a quota exhaustion response for the current account.",
      fix: "Wait a few minutes, then retry `slashcash sync`.",
      message: "Gmail quota was exhausted. Try again later.",
    };
  }

  if (lower.includes("429") || lower.includes("rate")) {
    return {
      code: "rate-limited",
      symptom: "Gmail rate-limited the sync.",
      cause: "Google asked the client to slow down.",
      fix: "Wait a few minutes, then retry `slashcash sync`.",
      message: "Gmail rate limit reached. Try again later.",
    };
  }

  if (/auth|credential|login/i.test(text)) {
    return {
      code: "not-authenticated",
      symptom: "gws is not authenticated.",
      cause: "The Gmail sync path needs a completed `gws auth login` session.",
      fix: `Run \`slashcash onboard\` or \`${GWS_GMAIL_LOGIN_COMMAND}\`.`,
      message: "gws is not authenticated. Run slashcash onboard.",
    };
  }

  const cause = text.slice(0, 200) || "gws command failed without stderr.";
  return {
    code: "unknown",
    symptom: "gws failed.",
    cause,
    fix: "Run `slashcash logs --filter ingest --tail 100` and retry `slashcash doctor --fix`.",
    message: cause,
  };
}
