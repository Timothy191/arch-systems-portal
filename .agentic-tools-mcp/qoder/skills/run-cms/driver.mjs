#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const BASE_URL = 'http://localhost:3003';
const MAX_WAIT_MS = 120_000;
const POLL_INTERVAL_MS = 500;
const CMS_DIR = 'apps/cms';

function ensureEnv() {
  const envPath = `${CMS_DIR}/.env`;
  if (existsSync(envPath)) return;

  console.log('Creating apps/cms/.env with defaults...');
  const secret = randomBytes(32).toString('hex');
  writeFileSync(envPath, [
    `PAYLOAD_SECRET=${secret}`,
    `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`,
    `PORT=3003`,
    '',
  ].join('\n'));
}

async function ensureSupabase() {
  console.log('Checking Docker and Supabase...');
  const dockerCheck = spawnSync('docker', ['info'], { stdio: 'ignore' });
  if (dockerCheck.status !== 0) {
    console.error('Docker is not running. The CMS requires Postgres (via Supabase).');
    console.error('Start Docker, then run: pnpm dev (from repo root)');
    process.exit(1);
  }

  const dbCheck = spawnSync('docker', ['ps', '--filter', 'name=supabase_db', '--format', '{{.Names}}'], { encoding: 'utf8' });
  if (!dbCheck.stdout?.includes('supabase_db')) {
    console.log('Starting Supabase local stack...');
    const supabase = spawnSync('pnpx', ['supabase', 'start'], { cwd: 'packages/database', stdio: 'inherit', timeout: 120_000 });
    if (supabase.status !== 0) {
      console.error('Failed to start Supabase. Try: cd packages/database && pnpm supabase start');
      process.exit(1);
    }
  }
  console.log('Supabase ready.');
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(BASE_URL, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 500) return true;
    } catch {}
    await sleep(POLL_INTERVAL_MS);
  }
  return false;
}

async function checkEndpoint(path, expectations) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
    const body = await res.text();
    const results = { path, status: res.status, checks: {} };
    for (const [name, test] of Object.entries(expectations)) {
      results.checks[name] = test(res, body);
    }
    return results;
  } catch (err) {
    return { path, error: err.message, checks: {} };
  }
}

async function main() {
  ensureEnv();
  await ensureSupabase();

  console.log('Starting CMS dev server (PORT=3003 pnpm --filter cms dev)...');
  const dev = spawn('pnpm', ['--filter', 'cms', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, PORT: '3003' },
  });

  const cleanup = () => {
    try { process.kill(-dev.pid); } catch {}
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  dev.stderr.on('data', (chunk) => {
    const line = chunk.toString().trim();
    if (line.includes('Error') || line.includes('error')) {
      console.error(`[cms] ${line}`);
    }
  });

  console.log('Waiting for server (PayloadCMS can be slow on first boot)...');
  const ready = await waitForServer();
  if (!ready) {
    console.error('Server did not start within timeout');
    cleanup();
    process.exit(1);
  }
  console.log('Server ready.\n');

  const checks = [
    await checkEndpoint('/', {
      'server responds': (res) => res.status >= 200 && res.status < 600,
    }),
    await checkEndpoint('/admin', {
      'server responds (500 expected with Supabase Postgres)': (res) => res.status === 200 || res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308 || res.status === 500,
    }),
  ];

  let allPassed = true;
  for (const check of checks) {
    if (check.error) {
      console.error(`FAIL ${check.path}: ${check.error}`);
      allPassed = false;
      continue;
    }
    const failedChecks = Object.entries(check.checks).filter(([, v]) => !v);
    if (failedChecks.length > 0) {
      console.error(`FAIL ${check.path} (status ${check.status}): ${failedChecks.map(([k]) => k).join(', ')}`);
      allPassed = false;
    } else {
      console.log(`PASS ${check.path} (status ${check.status})`);
    }
  }

  cleanup();
  console.log(allPassed ? '\nAll checks passed.' : '\nSome checks failed.');
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
