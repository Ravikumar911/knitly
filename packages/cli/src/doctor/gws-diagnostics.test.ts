import { describe, expect, it } from "vitest";
import { classifyGwsDiagnostic } from "./gws-diagnostics.js";

describe("classifyGwsDiagnostic", () => {
  it("classifies Google Workspace auth and gcloud failures", () => {
    const diagnostic = classifyGwsDiagnostic(
      '{"error":"invalid_client","message":"The provided client secret is invalid."}',
    );
    expect(diagnostic.code).toBe("auth-invalid-client");
    expect(diagnostic.fix).toMatch(/gws auth setup/);

    expect(
      classifyGwsDiagnostic(
        "accessNotConfigured: Gmail API has not been used in project 123 before or it is disabled.",
      ).code,
    ).toBe("api-not-enabled");

    expect(classifyGwsDiagnostic("gcloud: command not found").code).toBe(
      "gcloud-missing",
    );

    const gcloudAuthDiagnostic = classifyGwsDiagnostic(
      "You do not currently have an active account selected.",
    );
    expect(gcloudAuthDiagnostic.code).toBe("gcloud-not-authenticated");
    expect(gcloudAuthDiagnostic.fix).toMatch(/--no-update-adc/);
  });
});
