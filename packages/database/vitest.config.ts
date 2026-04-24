import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import { createSlashcashVitestConfig } from "../typescript-config/vitest.base";

export default mergeConfig(
  createSlashcashVitestConfig({
    packageRoot: dirname(fileURLToPath(import.meta.url)),
    coverageInclude: ["src/**/*.ts"],
  }),
  defineConfig({
    test: {
      fileParallelism: false,
    },
  }),
);
