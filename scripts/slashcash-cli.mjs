#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

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

function printHelp() {
  console.log(`slashcash CLI

Usage:
  slashcash onboard [--yes]
  slashcash doctor
  slashcash start
  slashcash status

Examples:
  npm i -g .
  slashcash onboard
  slashcash start
`);
}

async function onboard() {
  const nonInteractive = rest.includes('--yes');

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

    console.log('🦀 Slashcash onboarding wizard\n');
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

  const ollama = runCapture('ollama', ['--version']);
  if (ollama.ok) {
    console.log(`✅ Ollama: ${ollama.stdout.split('\n')[0]}`);
  } else {
    console.log('⚠️  Ollama: not found (assistant chat will fail until a local OpenAI-compatible model endpoint is running).');
  }

  if (!allGood) {
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
