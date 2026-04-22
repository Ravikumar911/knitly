import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

type CoverageThresholds = {
  branches?: number;
  functions?: number;
  lines?: number;
  statements?: number;
};

type SlashcashVitestConfigOptions = {
  packageRoot: string;
  environment?: "node" | "jsdom";
  include?: string[];
  coverageInclude?: string[];
  coverageThresholds?: CoverageThresholds;
};

const configRoot = dirname(fileURLToPath(import.meta.url));
const isCi =
  process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const includeIntegration = process.env.VITEST_INTEGRATION === "1";

export const slashcashVitestGlobalSetup = join(
  configRoot,
  "vitest.global-setup.ts",
);

export function createSlashcashVitestConfig(
  options: SlashcashVitestConfigOptions,
) {
  const include = options.include ?? ["src/**/*.test.ts", "test/**/*.test.ts"];
  const reporters = isCi
    ? (["default", "github-actions", "junit"] as const)
    : (["default"] as const);

  return defineConfig({
    root: options.packageRoot,
    test: {
      environment: options.environment ?? "node",
      globals: false,
      include,
      exclude: [
        ".next/**",
        "dist/**",
        "coverage/**",
        "node_modules/**",
        ...(includeIntegration ? [] : ["**/*.integration.test.ts"]),
      ],
      globalSetup: [slashcashVitestGlobalSetup],
      hookTimeout: 30_000,
      testTimeout: 30_000,
      clearMocks: true,
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
      reporters: [...reporters],
      outputFile: isCi
        ? { junit: join(options.packageRoot, "test-results", "vitest.junit.xml") }
        : undefined,
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        reportsDirectory: join(options.packageRoot, "coverage"),
        include: options.coverageInclude ?? ["src/**/*.ts", "src/**/*.tsx"],
        exclude: [
          "**/*.test.ts",
          "**/*.integration.test.ts",
          "**/*.d.ts",
          "dist/**",
          "coverage/**",
          "node_modules/**",
          ".next/**",
          "next-env.d.ts",
          "scripts/**",
          "test/**",
          "test-fixtures/**",
          "**/migrations/**",
        ],
        thresholds: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0,
          ...options.coverageThresholds,
        },
      },
    },
  });
}
