import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePaths } from "../config/paths.js";
import {
  BUNDLED_GMAIL_SWIGGY_SKILL,
  installBundledSkills,
  isSkillEnabled,
  listInstalledSkills,
  setSkillEnabled,
} from "./registry.js";

function writeSkillManifest(dir: string, manifest: Record<string, unknown>) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

describe("skill registry", () => {
  const previousHome = process.env.SLASHCASH_HOME;
  const previousDbPath = process.env.SQLITE_DB_PATH;
  let home = "";

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "slashcash-cli-skills-"));
    process.env.SLASHCASH_HOME = home;
    delete process.env.SQLITE_DB_PATH;
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.SLASHCASH_HOME;
    } else {
      process.env.SLASHCASH_HOME = previousHome;
    }

    if (previousDbPath === undefined) {
      delete process.env.SQLITE_DB_PATH;
    } else {
      process.env.SQLITE_DB_PATH = previousDbPath;
    }

    rmSync(home, { recursive: true, force: true });
  });

  it("installs bundled skills and enables the Gmail sync skill by default", () => {
    installBundledSkills();
    const paths = resolvePaths();
    const installed = listInstalledSkills();

    expect(existsSync(join(paths.skills, BUNDLED_GMAIL_SWIGGY_SKILL))).toBe(
      true,
    );
    expect(installed.map((skill) => skill.id)).toContain(
      BUNDLED_GMAIL_SWIGGY_SKILL,
    );
    expect(isSkillEnabled(BUNDLED_GMAIL_SWIGGY_SKILL)).toBe(true);
  });

  it("lists skills in sorted order and reads enabled flags from config", () => {
    installBundledSkills();
    setSkillEnabled(BUNDLED_GMAIL_SWIGGY_SKILL, false);

    const paths = resolvePaths();
    writeSkillManifest(join(paths.skills, "alpha-skill"), {
      id: "alpha-skill",
      name: "Alpha skill",
      version: "1.2.3",
      category: "automation",
      description: "An extra local skill",
      requires: { bins: [] },
      jobs: [],
    });

    const installed = listInstalledSkills();

    expect(
      installed.map((skill) => `${skill.id}:${String(skill.enabled)}`),
    ).toEqual(["alpha-skill:false", "gmail-swiggy:false"]);
  });

  it("updates the enabled flag for installed skills and rejects unknown skills", () => {
    installBundledSkills();

    setSkillEnabled(BUNDLED_GMAIL_SWIGGY_SKILL, false);
    expect(isSkillEnabled(BUNDLED_GMAIL_SWIGGY_SKILL)).toBe(false);

    expect(() => setSkillEnabled("missing-skill", true)).toThrow(
      "Unknown skill: missing-skill",
    );
  });
});
