#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE_URL = 'http://localhost:3000';
const MAX_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(BASE_URL, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 400) return true;
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
  console.log('Starting portal dev server (pnpm dev --quick)...');
  const dev = spawn('pnpm', ['dev', '--quick'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  const cleanup = () => {
    try { process.kill(-dev.pid); } catch {}
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  console.log('Waiting for server...');
  const ready = await waitForServer();
  if (!ready) {
    console.error('Server did not start within timeout');
    cleanup();
    process.exit(1);
  }
  console.log('Server ready.\n');

  const checks = [
    await checkEndpoint('/', {
      'returns 200 or redirect': (res) => res.status === 200 || res.status === 307 || res.status === 308,
      'has HTML': (_, body) => body.includes('<!DOCTYPE html>') || body.includes('<html'),
    }),
    await checkEndpoint('/auth/login', {
      'returns 200': (res) => res.status === 200,
      'has login form elements': (_, body) => body.includes('login') || body.includes('password') || body.includes('email'),
    }),
    await checkEndpoint('/api/health', {
      'returns 200': (res) => res.status === 200,
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
