import { describe, expect, it } from "vitest";
import { classifyGwsError } from "./gws-errors.js";

describe("classifyGwsError", () => {
  it("maps known stderr signatures to closed error codes", () => {
    expect(classifyGwsError("invalid_client").code).toBe(
      "auth-invalid-client",
    );
    expect(classifyGwsError("access_denied").code).toBe("auth-access-denied");
    expect(classifyGwsError("invalid_scope").code).toBe("auth-invalid-scope");
    expect(classifyGwsError("invalid_scope").fix).toContain(
      "gws auth login --services gmail --readonly",
    );
    expect(classifyGwsError("redirect_uri_mismatch").code).toBe(
      "auth-redirect-uri-mismatch",
    );
    expect(
      classifyGwsError(
        "accessNotConfigured: Gmail API has not been used in project 123 before or it is disabled.",
      ).code,
    ).toBe("api-not-enabled");
    expect(classifyGwsError("gcloud: command not found").code).toBe(
      "gcloud-missing",
    );
    expect(
      classifyGwsError("You do not currently have an active account selected.")
        .code,
    ).toBe("gcloud-not-authenticated");
    expect(
      classifyGwsError("Reauthentication is needed. Please run gcloud auth login")
        .fix,
    ).toContain("gcloud auth login --brief --no-update-adc");
    expect(classifyGwsError("429 too many requests").code).toBe(
      "rate-limited",
    );
  });
});
