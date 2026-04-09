#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output, platform } from 'node:process';

const [, , command, ...rest] = process.argv;

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: process.env,
    ...options,
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCapture(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: 'pipe',
    env: process.env,
    encoding: 'utf-8',
  });

  return {
    ok: (result.status ?? 1) === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

function commandExists(cmd) {
  const result = runCapture('bash', ['-lc', `command -v ${cmd}`]);
  return result.ok && !!result.stdout;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureHomebrew() {
  if (platform !== 'darwin') return;

  if (commandExists('brew')) return;

  console.log('🍺 Homebrew not found. Installing Homebrew...');
  run('bash', [
    '-lc',
    '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
  ]);

  const paths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'];
  const brewPath = paths.find((p) => runCapture('bash', ['-lc', `[ -x ${p} ] && echo ok`]).stdout === 'ok');
  if (!brewPath) {
    console.log('⚠️ Homebrew installed but brew is not on PATH yet. Restart shell and rerun slashcash onboard.');
    process.exit(1);
  }

  process.env.PATH = `${brewPath.replace('/brew', '')}:${process.env.PATH}`;
}

function brewInstallIfMissing(brewName, binary = brewName, cask = false) {
  if (commandExists(binary)) return;

  const args = cask ? ['install', '--cask', brewName] : ['install', brewName];
  console.log(`📦 Installing ${brewName}...`);
  run('brew', args);
}

async function ensureDockerEngine() {
  if (!commandExists('docker')) {
    console.log('🐳 Docker CLI is missing.');
    if (platform === 'darwin') {
      brewInstallIfMissing('docker', 'docker', true);
    } else {
      console.log('Install Docker manually, then rerun: https://docs.docker.com/engine/install/');
      process.exit(1);
    }
  }

  let info = runCapture('docker', ['info']);
  if (info.ok) return;

  if (platform === 'darwin') {
    console.log('🐳 Starting Docker Desktop...');
    runCapture('open', ['-a', 'Docker']);

    for (let i = 0; i < 60; i += 1) {
      await sleep(2000);
      info = runCapture('docker', ['info']);
      if (info.ok) return;
      process.stdout.write('.');
    }
    console.log('\n❌ Docker Desktop did not become ready in time. Open Docker Desktop manually and rerun.');
    process.exit(1);
  }

  console.log('❌ Docker daemon is not running. Start Docker and rerun.');
  process.exit(1);
}

async function ensureOllamaAndGemma4() {
  if (!commandExists('ollama')) {
    if (platform === 'darwin') {
      brewInstallIfMissing('ollama');
    } else {
      console.log('Install Ollama manually: https://ollama.com/download');
      process.exit(1);
    }
  }

  let list = runCapture('ollama', ['list']);
  if (!list.ok) {
    console.log('🧠 Starting Ollama service...');
    spawn('ollama', ['serve'], { stdio: 'ignore', detached: true }).unref();
    await sleep(2000);
    list = runCapture('ollama', ['list']);
  }

  if (!list.ok) {
    console.log('❌ Ollama is not reachable. Start it manually (`ollama serve`) and rerun.');
    process.exit(1);
  }

  if (!list.stdout.includes('gemma4')) {
    console.log('⬇️ Pulling gemma4 model (this may take a while)...');
    run('ollama', ['pull', 'gemma4']);
  }
}

async function ensureFirstTimeDependencies() {
  console.log('🔧 Preparing first-time local dependencies...');

  if (platform === 'darwin') {
    await ensureHomebrew();
    brewInstallIfMissing('pnpm');
    brewInstallIfMissing('git');
  } else {
    if (!commandExists('pnpm')) {
      console.log('❌ pnpm is missing. Install pnpm first: https://pnpm.io/installation');
      process.exit(1);
    }
  }

  await ensureDockerEngine();
  await ensureOllamaAndGemma4();
}

function printHelp() {
  console.log(`slashcash CLI (personal finance agent)

Usage:
  slashcash onboard [--yes]
  slashcash doctor
  slashcash start
  slashcash status

Notes:
  - onboard is first-time-user friendly and installs missing dependencies on macOS.
  - the app runs only the personal finance product (no website app required).
`);
}

async function onboard() {
  const nonInteractive = rest.includes('--yes');

  await ensureFirstTimeDependencies();

  const defaults = {
    dbHost: process.env.SLASHCASH_DB_HOST ?? '127.0.0.1',
    dbPort: process.env.SLASHCASH_DB_PORT ?? '5432',
    dbUser: process.env.SLASHCASH_DB_USER ?? 'slash',
    dbPassword: process.env.SLASHCASH_DB_PASSWORD ?? 'slash',
    dbName: process.env.SLASHCASH_DB_NAME ?? 'slashcash',
    model: process.env.LOCAL_LLM_MODEL ?? 'gemma4',
    modelBaseURL: process.env.LOCAL_LLM_BASE_URL ?? 'http://127.0.0.1:11434/v1',
  };

  const cfg = { ...defaults };

  if (!nonInteractive) {
    const rl = createInterface({ input, output });

    console.log('\n🦀 Welcome to Slashcash onboarding wizard\n');
    cfg.dbHost = (await rl.question(`DB host [${defaults.dbHost}]: `)).trim() || defaults.dbHost;
    cfg.dbPort = (await rl.question(`DB port [${defaults.dbPort}]: `)).trim() || defaults.dbPort;
    cfg.dbUser = (await rl.question(`DB user [${defaults.dbUser}]: `)).trim() || defaults.dbUser;
    cfg.dbPassword = (await rl.question(`DB password [${defaults.dbPassword}]: `)).trim() || defaults.dbPassword;
    cfg.dbName = (await rl.question(`DB name [${defaults.dbName}]: `)).trim() || defaults.dbName;
    cfg.modelBaseURL = (await rl.question(`LLM base URL [${defaults.modelBaseURL}]: `)).trim() || defaults.modelBaseURL;
    cfg.model = (await rl.question(`Default model [${defaults.model}]: `)).trim() || defaults.model;

    const proceed = (await rl.question('Continue with setup? [Y/n]: ')).trim().toLowerCase();
    await rl.close();

    if (proceed === 'n' || proceed === 'no') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  const databaseURL = `postgres://${cfg.dbUser}:${cfg.dbPassword}@${cfg.dbHost}:${cfg.dbPort}/${cfg.dbName}`;

  const env = {
    ...process.env,
    DATABASE_URL: databaseURL,
    LOCAL_MODE: 'true',
    LOCAL_LLM_BASE_URL: cfg.modelBaseURL,
    LOCAL_LLM_MODEL: cfg.model,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'local-dev-key',
  };

  run('bash', ['scripts/setup-local.sh'], { env });

  console.log('\n✅ Onboarding complete.');
  console.log('Run: slashcash start');
}

function doctor() {
  const checks = [
    ['node', ['--version'], 'Node.js'],
    ['pnpm', ['--version'], 'pnpm'],
    ['docker', ['--version'], 'Docker'],
    ['docker', ['compose', 'version'], 'Docker Compose'],
    ['ollama', ['--version'], 'Ollama'],
  ];

  let allGood = true;

  console.log('🔎 Running local environment checks...\n');
  for (const [cmd, args, label] of checks) {
    const result = runCapture(cmd, args);
    if (result.ok) {
      console.log(`✅ ${label}: ${result.stdout.split('\n')[0]}`);
    } else {
      allGood = false;
      console.log(`❌ ${label}: not available (${result.stderr || 'command failed'})`);
    }
  }

  const dockerReady = runCapture('docker', ['info']);
  if (dockerReady.ok) {
    console.log('✅ Docker daemon is running.');
  } else {
    allGood = false;
    console.log('❌ Docker daemon is not running.');
  }

  if (!allGood) {
    console.log('\nRun `slashcash onboard` to auto-fix on macOS, or install missing dependencies manually.');
    process.exit(1);
  }
}

function start() {
  run('pnpm', ['--filter', '@knitly/main', 'dev']);
}

function status() {
  const result = runCapture('docker', ['ps', '--filter', 'name=slashcash-postgres', '--format', '{{.Names}} {{.Status}}']);
  if (!result.ok || !result.stdout) {
    console.log('⚠️  Postgres container is not running. Run: slashcash onboard');
    return;
  }

  console.log(`✅ ${result.stdout}`);

  const ollama = runCapture('ollama', ['list']);
  if (ollama.ok) {
    const hasGemma4 = ollama.stdout.includes('gemma4');
    console.log(hasGemma4 ? '✅ gemma4 is available in Ollama.' : '⚠️  gemma4 not found. Run: ollama pull gemma4');
  } else {
    console.log('⚠️  Ollama is not reachable.');
  }
}

if (!command || ['help', '--help', '-h'].includes(command)) {
  printHelp();
  process.exit(0);
}

if (command === 'onboard') {
  await onboard();
  process.exit(0);
}

if (command === 'doctor') {
  doctor();
  process.exit(0);
}

if (command === 'start') {
  start();
  process.exit(0);
}

if (command === 'status') {
  status();
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
printHelp();
process.exit(1);
