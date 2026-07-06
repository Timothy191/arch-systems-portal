#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE_URL = 'http://localhost:3001';
const MAX_WAIT_MS = 120_000;
const POLL_INTERVAL_MS = 500;

async function ensureSupabase() {
  console.log('Checking Docker and Supabase...');
  const dockerCheck = spawnSync('docker', ['info'], { stdio: 'ignore' });
  if (dockerCheck.status !== 0) {
    console.error('Docker is not running. The API requires Supabase (Redis + Postgres).');
    console.error('Start Docker, then run: pnpm dev (from repo root)');
    process.exit(1);
  }

  const redisCheck = spawnSync('docker', ['ps', '--filter', 'name=supabase', '--format', '{{.Names}}'], { encoding: 'utf8' });
  if (!redisCheck.stdout?.includes('supabase')) {
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
      const res = await fetch(`${BASE_URL}/api/health/live`);
      if (res.ok) return true;
    } catch {}
    await sleep(POLL_INTERVAL_MS);
  }
  return false;
}

async function checkEndpoint(path, expectations) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    const results = { path, status: res.status, checks: {} };
    for (const [name, test] of Object.entries(expectations)) {
      results.checks[name] = test(res, text, json);
    }
    return results;
  } catch (err) {
    return { path, error: err.message, checks: {} };
  }
}

async function main() {
  await ensureSupabase();
  console.log('Starting API dev server (pnpm --filter api dev)...');
  const dev = spawn('pnpm', ['--filter', 'api', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, PORT: '3001' },
  });

  const cleanup = () => {
    try { process.kill(-dev.pid); } catch {}
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  dev.stderr.on('data', (chunk) => {
    const line = chunk.toString().trim();
    if (line.includes('Error') || line.includes('error')) {
      console.error(`[api] ${line}`);
    }
  });

  console.log('Waiting for server...');
  const ready = await waitForServer();
  if (!ready) {
    console.error('Server did not start within timeout');
    cleanup();
    process.exit(1);
  }
  console.log('Server ready.\n');

  const checks = [
    await checkEndpoint('/api/health/live', {
      'returns 200': (res) => res.status === 200,
      'returns status ok': (_res, _text, json) => json?.status === 'ok',
    }),
    await checkEndpoint('/api/docs', {
      'returns 200': (res) => res.status === 200,
      'serves swagger UI': (_res, text) => text.includes('swagger') || text.includes('Swagger') || text.includes('html'),
    }),
    await checkEndpoint('/api/health', {
      'responds (may be unhealthy without deps)': (res) => res.status === 200 || res.status === 503,
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
