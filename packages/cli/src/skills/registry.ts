import { cpSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, writeConfig } from "../config/load.js";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";
import { skillManifestSchema, type InstalledSkill } from "./schema.js";

export const BUNDLED_GMAIL_SWIGGY_SKILL = "gmail-swiggy";

export function bundledSkillsRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "bundled-skills");
}

export function installBundledSkills() {
  const paths = resolvePaths();
  ensureStateDirs(paths);

  const sourceRoot = bundledSkillsRoot();
  if (!existsSync(sourceRoot)) return;

  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const from = join(sourceRoot, entry.name);
    const to = join(paths.skills, entry.name);
    cpSync(from, to, { recursive: true, force: false, errorOnExist: false });
  }

  const config = loadConfig({ createIfMissing: true });
  config.skills.enabled[BUNDLED_GMAIL_SWIGGY_SKILL] ??= true;
  writeConfig(config);
}

export function listInstalledSkills(): InstalledSkill[] {
  const paths = resolvePaths();
  ensureStateDirs(paths);
  const config = loadConfig({ createIfMissing: true });

  return readdirSync(paths.skills, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const dir = join(paths.skills, entry.name);
      const manifestPath = join(dir, "manifest.json");
      if (!existsSync(manifestPath)) return [];
      const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
      const manifest = skillManifestSchema.parse(raw);
      return [
        {
          id: manifest.id,
          dir,
          manifest,
          enabled: config.skills.enabled[manifest.id] ?? false,
        },
      ];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function setSkillEnabled(skillId: string, enabled: boolean) {
  const skills = listInstalledSkills();
  if (!skills.some((skill) => skill.id === skillId)) {
    throw new Error(`Unknown skill: ${skillId}`);
  }

  const config = loadConfig({ createIfMissing: true });
  config.skills.enabled[skillId] = enabled;
  writeConfig(config);
}

export function isSkillEnabled(skillId: string) {
  const config = loadConfig({ createIfMissing: true });
  return config.skills.enabled[skillId] ?? false;
}
