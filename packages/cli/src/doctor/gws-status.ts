export const GWS_GMAIL_LOGIN_COMMAND =
  "gws auth login --services gmail --readonly";

const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

const BROAD_SCOPES = new Set([
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/gmail",
  "https://www.googleapis.com/auth/gmail.modify",
]);

type GwsStatusPayload = {
  has_refresh_token?: boolean;
  scopes?: unknown;
  status?: string;
  token_valid?: boolean;
};

export type ParsedGwsStatus = {
  hasRefreshToken: boolean;
  isGmailReadonly: boolean;
  scopes: string[];
  tokenValid: boolean;
};

export function hasGmailReadonlyCredential(
  parsed: ParsedGwsStatus | null,
): parsed is ParsedGwsStatus {
  return (
    parsed !== null &&
    parsed.hasRefreshToken &&
    parsed.tokenValid &&
    parsed.isGmailReadonly
  );
}

export function parseGwsStatusOutput(output: string): ParsedGwsStatus | null {
  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) return null;

  try {
    const parsed = JSON.parse(output.slice(jsonStart)) as GwsStatusPayload;
    const scopes = Array.isArray(parsed.scopes)
      ? parsed.scopes.filter(
          (scope): scope is string => typeof scope === "string",
        )
      : [];
    const scopeSet = new Set(scopes);
    const hasReadonlyScope =
      scopeSet.has(GMAIL_READONLY_SCOPE) || scopeSet.has("gmail.readonly");
    const hasBroadScope = scopes.some((scope) => BROAD_SCOPES.has(scope));

    return {
      hasRefreshToken: parsed.has_refresh_token === true,
      isGmailReadonly: hasReadonlyScope && !hasBroadScope,
      scopes,
      tokenValid: parsed.token_valid === true || parsed.status === "success",
    };
  } catch {
    return null;
  }
}
