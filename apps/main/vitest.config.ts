import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createSlashcashVitestConfig } from "../../packages/typescript-config/vitest.base";

const packageRoot = dirname(fileURLToPath(import.meta.url));

export default createSlashcashVitestConfig({
  packageRoot,
  include: ["**/*.test.ts", "**/*.test.tsx"],
  coverageInclude: [
    "app/api/**/*.ts",
    "hooks/**/*.ts",
    "lib/**/*.ts",
    "store/**/*.ts",
    "trpc/**/*.ts",
  ],
});
