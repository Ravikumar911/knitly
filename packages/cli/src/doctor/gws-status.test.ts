import { describe, expect, it } from "vitest";
import {
  hasGmailReadonlyCredential,
  parseGwsStatusOutput,
} from "./gws-status.js";

describe("gws status parsing", () => {
  it("accepts a valid Gmail read-only credential with keyring prelude", () => {
    const parsed = parseGwsStatusOutput(
      [
        "Using keyring backend: keyring",
        JSON.stringify({
          has_refresh_token: true,
          scopes: [
            "https://www.googleapis.com/auth/gmail.readonly",
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
          ],
          token_valid: true,
        }),
      ].join("\n"),
    );

    expect(parsed?.isGmailReadonly).toBe(true);
    expect(hasGmailReadonlyCredential(parsed)).toBe(true);
  });

  it("rejects broad Gmail and cloud scopes", () => {
    const parsed = parseGwsStatusOutput(
      JSON.stringify({
        has_refresh_token: true,
        scopes: [
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/cloud-platform",
          "openid",
        ],
        token_valid: true,
      }),
    );

    expect(parsed?.isGmailReadonly).toBe(false);
    expect(hasGmailReadonlyCredential(parsed)).toBe(false);
  });

  it("rejects read-only scopes without a valid refresh token", () => {
    const parsed = parseGwsStatusOutput(
      JSON.stringify({
        has_refresh_token: false,
        scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
        token_valid: false,
      }),
    );

    expect(parsed?.isGmailReadonly).toBe(true);
    expect(hasGmailReadonlyCredential(parsed)).toBe(false);
  });
});
