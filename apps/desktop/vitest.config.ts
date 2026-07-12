import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createSlashcashVitestConfig } from "../../packages/typescript-config/vitest.base";

export default createSlashcashVitestConfig({
  packageRoot: dirname(fileURLToPath(import.meta.url)),
  coverageInclude: ["src/**/*.ts"],
});
