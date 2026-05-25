import { accessSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { findPackagedServer } from "./resolve-server.js";

describe("resolve-server", () => {
  it("finds the bundled dashboard server inside dist", () => {
    const server = findPackagedServer();
    if (!import.meta.url.includes(`${sep}dist${sep}`)) {
      expect(server).toBeNull();
      return;
    }

    expect(server).toBeTruthy();
    accessSync(server!);
    expect(server).toMatch(/server\.js$/);
    expect(server).toContain(`${sep}dist${sep}app${sep}`);
  });
});
