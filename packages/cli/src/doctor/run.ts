import pc from "picocolors";
import { runChecks } from "./checks.js";

export async function runDoctor(options: { fix?: boolean } = {}) {
  const checks = await runChecks(options);
  const failed = checks.filter((check) => check.status === "fail");

  for (const check of checks) {
    const marker = check.status === "ok" ? pc.green("ok") : pc.red("fail");
    console.log(`${marker} ${check.name}: ${check.message}`);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }

  return checks;
}
