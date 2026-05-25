import type { Command } from "commander";

type Register = (program: Command) => void | Promise<void>;

const commandLoaders: Array<{
  id: string;
  load: () => Promise<{ register: Register }>;
}> = [
  { id: "start", load: () => import("./registry/start.js") },
  { id: "server", load: () => import("./registry/server.js") },
  { id: "stop", load: () => import("./registry/stop.js") },
  { id: "status", load: () => import("./registry/status.js") },
  { id: "doctor", load: () => import("./registry/doctor.js") },
  { id: "reset", load: () => import("./registry/reset.js") },
  { id: "config", load: () => import("./registry/config.js") },
  { id: "db", load: () => import("./registry/db.js") },
  { id: "onboard", load: () => import("./registry/onboard.js") },
  { id: "privacy", load: () => import("./registry/privacy.js") },
  { id: "sync", load: () => import("./registry/sync.js") },
  { id: "assistant", load: () => import("./registry/assistant.js") },
  { id: "skills", load: () => import("./registry/skills.js") },
  { id: "logs", load: () => import("./registry/logs.js") },
];

function requestedCommand(args: string[]) {
  return args.find((arg) => !arg.startsWith("-"));
}

function shouldRegisterAll(args: string[]) {
  const requested = requestedCommand(args);
  return !requested || args.includes("--help") || args.includes("-h");
}

export async function registerCommands(program: Command, args: string[]) {
  const loaders = shouldRegisterAll(args)
    ? commandLoaders
    : commandLoaders.filter((command) => command.id === requestedCommand(args));

  for (const loader of loaders) {
    const command = await loader.load();
    await command.register(program);
  }
}
