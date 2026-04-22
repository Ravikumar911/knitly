import { describe, expect, it } from "vitest";
import {
  classifyImapError,
  isCredentialError,
  toImapCliErrorBlock,
} from "./imap-errors";

describe("imap error classification", () => {
  it("classifies app-password failures as credential errors", () => {
    const error = classifyImapError(
      "[AUTHENTICATIONFAILED] Invalid credentials (Failure)",
    );

    expect(error.code).toBe("imap-auth-failed-bad-password");
    expect(isCredentialError(error)).toBe(true);
    expect(toImapCliErrorBlock(error)).toMatchObject({
      area: "auth",
    });
  });

  it("classifies connection failures as network issues", () => {
    const error = classifyImapError("connect ECONNREFUSED 127.0.0.1:993");

    expect(error.code).toBe("imap-connect-failed");
    expect(isCredentialError(error)).toBe(false);
    expect(toImapCliErrorBlock(error)).toMatchObject({
      area: "network",
    });
  });
});
