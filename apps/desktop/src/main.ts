import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { app, BrowserWindow, shell } from "electron";
import { resolveDesktopProductHome } from "./slashcash-home.js";

const DEFAULT_PORT = 3000;
const SERVER_START_TIMEOUT_MS = 45_000;
const HEALTH_PATH = "/api/healthz";

let mainWindow: BrowserWindow | null = null;
let dashboardProcess: ChildProcess | null = null;

async function createWindow() {
  const port = await resolvePort();
  const dashboardUrl = `http://127.0.0.1:${port}`;

  await ensureDashboardServer(port);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "slash.cash",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(dashboardUrl)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  await mainWindow.loadURL(dashboardUrl);
}

async function ensureDashboardServer(port: number) {
  if (await isDashboardHealthy(port)) {
    return;
  }

  dashboardProcess = spawnDashboardServer(port);
  await waitForDashboard(port);
}

function spawnDashboardServer(port: number) {
  const launch = resolveDashboardLaunch();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SLASHCASH_HOME: resolveDesktopProductHome(),
    PORT: String(port),
    SLASHCASH_PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NEXT_TELEMETRY_DISABLED: "1",
    SLASHCASH_NO_OPEN: "1",
    SLASHCASH_FOREGROUND: "1",
  };

  if (launch.runAsNode) {
    env.ELECTRON_RUN_AS_NODE = "1";
  }

  const child = spawn(launch.command, launch.args, {
    cwd: launch.cwd,
    stdio: "inherit",
    env,
    shell: process.platform === "win32" && launch.command.endsWith(".cmd"),
  });

  child.once("exit", (code, signal) => {
    if (dashboardProcess === child) {
      dashboardProcess = null;
    }

    if (code !== 0 && signal !== "SIGTERM") {
      console.error(`Dashboard server exited with code ${String(code)}.`);
    }
  });

  return child;
}

function resolveDashboardLaunch(): {
  command: string;
  args: string[];
  cwd: string;
  runAsNode: boolean;
} {
  const cliEntrypoint = resolveCliEntrypoint();
  if (cliEntrypoint) {
    return {
      command: process.execPath,
      args: [
        cliEntrypoint,
        "server",
        "run",
        "--port",
        String(resolveCachedPort()),
        "--no-open",
      ],
      cwd: dirname(cliEntrypoint),
      runAsNode: true,
    };
  }

  const repoRoot = resolveRepoRoot();
  return {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: [
      "--filter",
      "slashcash",
      "dev",
      "--",
      "server",
      "run",
      "--port",
      String(resolveCachedPort()),
      "--no-open",
    ],
    cwd: repoRoot,
    runAsNode: false,
  };
}

function resolveCliEntrypoint() {
  if (process.env.SLASHCASH_CLI_ENTRYPOINT) {
    return process.env.SLASHCASH_CLI_ENTRYPOINT;
  }

  const candidates = [
    join(process.resourcesPath, "slashcash", "entry.js"),
    join(process.resourcesPath, "app", "packages", "cli", "dist", "entry.js"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

async function waitForDashboard(port: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SERVER_START_TIMEOUT_MS) {
    if (await isDashboardHealthy(port)) {
      return;
    }

    await delay(500);
  }

  throw new Error(`Dashboard did not become healthy on port ${port}.`);
}

async function isDashboardHealthy(port: number) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${HEALTH_PATH}`);
    return response.ok;
  } catch {
    return false;
  }
}

let cachedPort: number | null = null;

async function resolvePort() {
  const rawPort =
    process.env.SLASHCASH_DESKTOP_PORT ?? process.env.SLASHCASH_PORT;
  if (!rawPort) {
    cachedPort = (await isDashboardHealthy(DEFAULT_PORT))
      ? DEFAULT_PORT
      : await findAvailablePort(DEFAULT_PORT);
    return cachedPort;
  }

  const port = Number.parseInt(rawPort, 10);
  if (Number.isInteger(port) && port > 0 && port < 65_536) {
    cachedPort = port;
    return port;
  }

  console.warn(`Ignoring invalid dashboard port: ${rawPort}`);
  cachedPort = await findAvailablePort(DEFAULT_PORT);
  return cachedPort;
}

function resolveCachedPort() {
  if (cachedPort === null) {
    throw new Error("Dashboard port was not resolved before launch.");
  }
  return cachedPort;
}

async function findAvailablePort(startPort: number) {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await canListen(port)) {
      return port;
    }
  }

  throw new Error(`No available dashboard port found near ${startPort}.`);
}

function canListen(port: number) {
  return new Promise<boolean>((resolveCanListen) => {
    const server = createServer();
    server.once("error", () => resolveCanListen(false));
    server.once("listening", () => {
      server.close(() => resolveCanListen(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function resolveRepoRoot() {
  if (process.env.SLASHCASH_REPO_ROOT) {
    return process.env.SLASHCASH_REPO_ROOT;
  }

  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDir, "../../..");
}

function delay(ms: number) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function stopDashboardServer() {
  if (dashboardProcess?.pid) {
    dashboardProcess.kill("SIGTERM");
  }

  dashboardProcess = null;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app
    .whenReady()
    .then(createWindow)
    .catch((error: unknown) => {
      console.error(error);
      app.quit();
    });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", stopDashboardServer);
}
