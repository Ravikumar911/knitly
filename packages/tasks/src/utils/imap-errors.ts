export type ImapErrorCode =
  | "imap-connect-failed"
  | "imap-tls-failed"
  | "imap-auth-failed-bad-password"
  | "imap-auth-failed-no-2fa"
  | "imap-auth-failed-advanced-protection"
  | "imap-auth-failed-workspace-policy"
  | "imap-rate-limited"
  | "imap-quota-exceeded"
  | "mailbox-not-selectable"
  | "unknown";

export type ImapError = {
  code: ImapErrorCode;
  message: string;
  symptom: string;
  cause: string;
  fix: string;
  docsUrl?: string;
  requiresCredentialReset: boolean;
};

type ImapTemplate = Omit<ImapError, "message">;

const templates: Record<ImapErrorCode, ImapTemplate> = {
  "imap-connect-failed": {
    code: "imap-connect-failed",
    symptom: "Could not reach Gmail IMAP.",
    cause: "The network connection to imap.gmail.com:993 failed or timed out.",
    fix: "Check your network, firewall, or VPN, then retry `slashcash sync --full`.",
    requiresCredentialReset: false,
  },
  "imap-tls-failed": {
    code: "imap-tls-failed",
    symptom: "The Gmail IMAP TLS handshake failed.",
    cause:
      "A local proxy, certificate problem, or TLS interception blocked the secure connection.",
    fix: "Disable TLS interception for imap.gmail.com:993, then retry the command.",
    requiresCredentialReset: false,
  },
  "imap-auth-failed-bad-password": {
    code: "imap-auth-failed-bad-password",
    symptom: "Gmail rejected the saved app password.",
    cause:
      "The saved app password is wrong, revoked, or no longer valid after a Google password change.",
    fix: "Run `slashcash doctor --reset-credentials`, generate a new app password, then rerun `slashcash onboard`.",
    docsUrl: "https://myaccount.google.com/apppasswords",
    requiresCredentialReset: true,
  },
  "imap-auth-failed-no-2fa": {
    code: "imap-auth-failed-no-2fa",
    symptom: "This Gmail account is not ready for app passwords.",
    cause:
      "App passwords only work after 2-Step Verification is enabled on the Google account.",
    fix: "Turn on 2-Step Verification, generate an app password, then rerun `slashcash onboard`.",
    docsUrl: "https://myaccount.google.com/signinoptions/twosv",
    requiresCredentialReset: true,
  },
  "imap-auth-failed-advanced-protection": {
    code: "imap-auth-failed-advanced-protection",
    symptom: "Gmail blocked app-password access for this account.",
    cause:
      "Google Advanced Protection disables the app-password IMAP flow slashcash relies on in v1.",
    fix: "Use a different Gmail account for v1, or disable Advanced Protection before retrying.",
    docsUrl: "https://support.google.com/accounts/answer/7539956",
    requiresCredentialReset: true,
  },
  "imap-auth-failed-workspace-policy": {
    code: "imap-auth-failed-workspace-policy",
    symptom:
      "This Google Workspace account does not allow app-password IMAP access.",
    cause:
      "The Workspace admin disabled IMAP app-password access for the tenant.",
    fix: "Use a personal Gmail account for v1, or ask the Workspace admin to allow app passwords.",
    requiresCredentialReset: true,
  },
  "imap-rate-limited": {
    code: "imap-rate-limited",
    symptom: "Gmail temporarily rate-limited IMAP access.",
    cause: "Too many IMAP requests were made in a short window.",
    fix: "Wait a few minutes, then retry `slashcash sync --full`.",
    requiresCredentialReset: false,
  },
  "imap-quota-exceeded": {
    code: "imap-quota-exceeded",
    symptom:
      "Gmail refused the request because the mailbox quota is exhausted.",
    cause:
      "The account is over storage quota or temporarily unavailable for mailbox operations.",
    fix: "Free up Gmail storage or wait for quota to recover, then rerun the sync.",
    requiresCredentialReset: false,
  },
  "mailbox-not-selectable": {
    code: "mailbox-not-selectable",
    symptom: "The Gmail mailbox could not be opened.",
    cause:
      "The INBOX mailbox was unavailable or not selectable for read-only IMAP access.",
    fix: "Verify that Gmail IMAP is enabled for the account, then retry the sync.",
    requiresCredentialReset: false,
  },
  unknown: {
    code: "unknown",
    symptom: "Gmail IMAP failed with an unexpected error.",
    cause: "slashcash did not recognize the exact IMAP failure signature.",
    fix: "Run `slashcash doctor`, then retry the command or capture the logs for debugging.",
    requiresCredentialReset: false,
  },
};

const matcherOrder: Array<[ImapErrorCode, RegExp[]]> = [
  [
    "imap-auth-failed-advanced-protection",
    [/advanced protection/i, /not available for advanced protection/i],
  ],
  [
    "imap-auth-failed-workspace-policy",
    [
      /workspace administrator/i,
      /administrator has restricted/i,
      /not enabled for imap use/i,
      /app passwords are not available for your account/i,
    ],
  ],
  [
    "imap-auth-failed-no-2fa",
    [
      /application-specific password required/i,
      /app password/i,
      /please log in via your web browser/i,
      /2-step verification/i,
    ],
  ],
  [
    "imap-auth-failed-bad-password",
    [
      /\[authenticationfailed\]/i,
      /invalid credentials/i,
      /login failed/i,
      /auth failed/i,
      /username and password not accepted/i,
    ],
  ],
  [
    "imap-rate-limited",
    [
      /rate limit/i,
      /too many simultaneous connections/i,
      /temporarily unavailable/i,
    ],
  ],
  [
    "imap-quota-exceeded",
    [/quota exceeded/i, /over quota/i, /insufficient system storage/i],
  ],
  [
    "mailbox-not-selectable",
    [/mailbox.*not selectable/i, /cannot open mailbox/i, /nonexistent/i],
  ],
  [
    "imap-tls-failed",
    [/tls/i, /ssl/i, /certificate/i, /self signed/i, /secure connection/i],
  ],
  [
    "imap-connect-failed",
    [/econnrefused/i, /enotfound/i, /eai_again/i, /timed out/i, /connect/i],
  ],
];

export function classifyImapError(error: unknown): ImapError {
  const message = normalizeMessage(error);
  const matched =
    matcherOrder.find(([, patterns]) =>
      patterns.some((pattern) => pattern.test(message)),
    )?.[0] ?? "unknown";

  const template = templates[matched];
  return {
    ...template,
    message,
  };
}

export function toImapCliError(error: unknown) {
  const classified = classifyImapError(error);
  return Object.assign(
    new Error(classified.message),
    toImapCliErrorBlock(classified),
  );
}

export function toImapCliErrorBlock(error: ImapError) {
  return {
    area: error.code.startsWith("imap-auth-") ? "auth" : "network",
    symptom: error.symptom,
    cause: error.cause,
    fix: error.fix,
    docs: error.docsUrl,
  };
}

export function isCredentialError(error: ImapError) {
  return error.code.startsWith("imap-auth-");
}

function normalizeMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}
