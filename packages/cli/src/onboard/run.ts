import pc from "picocolors";
import { loadConfig } from "../config/load.js";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";
import { loadDatabase } from "../runtime/database.js";
import { commandExists, runCommand, runInteractive } from "../runtime/subprocess.js";
import { installBundledSkills } from "../skills/registry.js";

const HOMEBREW_INSTALL_URL = "https://brew.sh/";
const OLLAMA_FORMULA = "ollama";
const GWS_BREW_FORMULA = "googleworkspace/tap/gws";

export async function runOnboard(options: {
  dryRun?: boolean;
  skipExternal?: boolean;
  skipAuth?: boolean;
} = {}) {
  const dryRun = options.dryRun === true;
  const skipExternal = options.skipExternal === true || dryRun;

  const paths = resolvePaths();
  ensureStateDirs(paths);
  const config = loadConfig({ createIfMissing: true });
  installBundledSkills();

  process.env.SQLITE_DB_PATH = paths.db;
  const { ensureLocalDatabase } = await loadDatabase();
  ensureLocalDatabase();

  console.log(pc.green("Local slash.cash state is ready."));
  console.log(`home        ${paths.home}`);
  console.log(`database    ${paths.db}`);
  console.log(`skills      ${paths.skills}`);

  if (skipExternal) {
    console.log(pc.yellow("Skipped host dependency checks."));
    return;
  }

  ensureHomebrew();
  ensureOllama(config.ai.chatModel, config.ai.ollamaBaseUrl);
  ensureGws();

  if (!options.skipAuth) {
    await ensureGwsAuth();
  }

  console.log(pc.green("Onboarding complete. Run slashcash start."));
}

function ensureHomebrew() {
  if (commandExists("brew")) return;

  throw new Error(
    `Homebrew is required. Install it from ${HOMEBREW_INSTALL_URL}, then rerun slashcash onboard.`,
  );
}

function ensureOllama(model: string, baseUrl: string) {
  if (!commandExists("ollama")) {
    const install = runCommand("brew", ["install", OLLAMA_FORMULA], { timeoutMs: 10 * 60_000 });
    if (!install.ok) {
      throw new Error(`Failed to install Ollama: ${install.stderr || install.stdout}`);
    }
  }

  runCommand("brew", ["services", "start", OLLAMA_FORMULA], { timeoutMs: 60_000 });

  const reachable = waitForOllama(baseUrl, 20_000);
  if (!reachable) {
    throw new Error("Ollama did not become reachable. Try: brew services restart ollama");
  }

  const pull = runCommand("ollama", ["pull", model], { timeoutMs: 30 * 60_000 });
  if (!pull.ok) {
    throw new Error(`Failed to pull ${model}: ${pull.stderr || pull.stdout}`);
  }
}

function ensureGws() {
  if (commandExists("gws")) return;

  const install = runCommand("brew", ["install", GWS_BREW_FORMULA], { timeoutMs: 10 * 60_000 });
  if (!install.ok) {
    throw new Error(`Failed to install gws from ${GWS_BREW_FORMULA}: ${install.stderr || install.stdout}`);
  }
}

async function ensureGwsAuth() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;

  const status = runCommand("gws", ["auth", "status", "--format", "json"], { timeoutMs: 15_000 });
  if (status.ok) return;

  console.log("Starting gws auth login. Complete the browser flow, then return here.");
  const code = await runInteractive("gws", ["auth", "login"]);
  if (code !== 0) {
    throw new Error("gws auth login did not complete successfully.");
  }
}

function waitForOllama(baseUrl: string, timeoutMs: number) {
  const started = Date.now();
  const endpoint = new URL(baseUrl);
  endpoint.pathname = "/api/tags";

  while (Date.now() - started < timeoutMs) {
    const result = runCommand("curl", ["-fsS", endpoint.toString()], { timeoutMs: 5_000 });
    if (result.ok) return true;
  }

  return false;
}
