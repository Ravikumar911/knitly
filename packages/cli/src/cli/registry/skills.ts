import type { Command } from "commander";
import { installBundledSkills, listInstalledSkills, setSkillEnabled } from "../../skills/registry.js";

export function register(program: Command) {
  const skills = program.command("skills").description("Manage local skills");

  skills.command("list").description("List installed skills").action(() => {
    installBundledSkills();
    const installed = listInstalledSkills();
    if (installed.length === 0) {
      console.log("No skills installed.");
      return;
    }

    for (const skill of installed) {
      console.log(`${skill.enabled ? "enabled " : "disabled"} ${skill.id} ${skill.manifest.version} ${skill.manifest.description}`);
    }
  });

  skills.command("enable")
    .argument("<id>", "Skill id")
    .description("Enable a skill")
    .action((id: string) => {
      installBundledSkills();
      setSkillEnabled(id, true);
      console.log(`Enabled ${id}.`);
    });

  skills.command("disable")
    .argument("<id>", "Skill id")
    .description("Disable a skill")
    .action((id: string) => {
      installBundledSkills();
      setSkillEnabled(id, false);
      console.log(`Disabled ${id}.`);
    });
}
