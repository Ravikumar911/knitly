import type { Command } from "commander";
import {
  getConfigValue,
  loadConfig,
  setConfigValue,
} from "../../config/load.js";
import { resolvePaths } from "../../config/paths.js";

export function register(program: Command) {
  const config = program
    .command("config")
    .description("Read and write local config");

  config
    .command("path")
    .description("Print config path")
    .action(() => {
      console.log(resolvePaths().config);
    });

  config
    .command("get")
    .argument("[path]", "Config path")
    .action((path?: string) => {
      const value = path
        ? getConfigValue(path)
        : loadConfig({ createIfMissing: true });
      console.log(
        typeof value === "string" ? value : JSON.stringify(value, null, 2),
      );
    });

  config
    .command("set")
    .argument("<path>")
    .argument("<value>")
    .action((path: string, value: string) => {
      setConfigValue(path, value);
      console.log(`Set ${path}`);
    });
}
