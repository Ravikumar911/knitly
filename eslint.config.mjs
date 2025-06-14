// This configuration only applies to the package manager root.
import { config } from "@workspace/eslint-config/base"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    ignores: ["apps/**", "packages/**"],
  },
]
