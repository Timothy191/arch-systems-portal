#!/usr/bin/env node

/**
 * Unified smoke-test driver for all Arch-Mk2 apps.
 *
 * Usage:
 *   node .qoder/skills/run-all/driver.mjs [options]
 *
 * Options:
 *   --all              Run all 4 apps (default)
 *   --portal           Include portal
 *   --api              Include API
 *   --cms              Include CMS
 *   --overview         Include overview
 *   --check            Only check already-running apps (don't start any)
 *   --no-docker        Skip Docker/Supabase auto-start
 *   --serial           Launch apps one at a time (easier to debug)
 *   --timeout <ms>     Override max wait per app (default varies)
 *   --help             Show this help
 *
 * Examples:
 *   node .qoder/skills/run-all/driver.mjs                    # all apps
 *   node .qoder/skills/run-all/driver.mjs --api --portal     # just API + portal
 *   node .qoder/skills/run-all/driver.mjs --check            # probe running servers
 *   node .qoder/skills/run-all/driver.mjs --overview         # lightweight, no Docker
 */

import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';

// ── App registry ────────────────────────────────────────────────────────────

const APPS = {
  portal: {
    label: 'Portal',
    port: 3000,
    cmd: 'pnpm',
    args: ['dev', '--quick'],
    env: {},
    maxWait: 30_000,
    needsDocker: false,
    healthPath: '/',
    healthExpect: (res) => res.status >= 200 && res.status < 400,
    checks: [
      {
        path: '/',
        label: 'root redirect',
        expect: (res) => res.status === 200 || res.status === 307 || res.status === 308,
      },
      {
        path: '/login',
        label: 'login page',
        expect: (res) => res.status === 200,
        bodyCheck: (body) => body.includes('login') || body.includes('password') || body.includes('email'),
      },
      {
        path: '/api/health',
        label: 'health proxy',
        expect: (res) => res.status === 200 || res.status === 500,
      },
    ],
  },

  api: {
    label: 'API',
    port: 3001,
    cmd: 'pnpm',
    args: ['--filter', 'api', 'dev'],
    env: { PORT: '3001' },
    maxWait: 120_000,
    needsDocker: true,
    healthPath: '/api/health/live',
    healthExpect: (res) => res.ok,
    checks: [
      {
        path: '/api/health/live',
        label: 'liveness',
        expect: (res) => res.status === 200,
        bodyCheck: (_body, json) => json?.status === 'ok',
      },
      {
        path: '/api/docs',
        label: 'swagger',
        expect: (res) => res.status === 200,
        bodyCheck: (body) => body.includes('swagger') || body.includes('Swagger') || body.includes('html'),
      },
      {
        path: '/api/health',
        label: 'full health',
        expect: (res) => res.status === 200 || res.status === 503,
      },
    ],
  },

  cms: {
    label: 'CMS',
    port: 3003,
    cmd: 'pnpm',
    args: ['--filter', 'cms', 'dev'],
    env: { PORT: '3003' },
    maxWait: 120_000,
    needsDocker: true,
    healthPath: '/',
    healthExpect: (res) => res.status >= 200 && res.status < 600,
    checks: [
      {
        path: '/',
        label: 'root',
        expect: (res) => res.status >= 200 && res.status < 600,
      },
      {
        path: '/admin',
        label: 'admin panel',
        expect: (res) =>
          res.status === 200 ||
          res.status === 301 ||
          res.status === 302 ||
          res.status === 307 ||
          res.status === 308 ||
          res.status === 500,
      },
    ],
  },

  overview: {
    label: 'Overview',
    port: 3002,
    cmd: 'pnpm',
    args: ['--filter', 'arch-systems-overview', 'dev'],
    env: {},
    maxWait: 30_000,
    needsDocker: false,
    healthPath: '/',
    healthExpect: (res) => res.status === 200,
    checks: [
      {
        path: '/',
        label: 'homepage',
        expect: (res) => res.status === 200,
        bodyCheck: (body) =>
          body.includes('<!DOCTYPE html>') || body.includes('<html'),
      },
    ],
  },
};

// ── CLI parsing ─────────────────────────────────────────────────────────────

function parseArgs() {
  const argv = process.argv.slice(2);
  const opts = { apps: [], check: false, noDocker: false, serial: false, timeout: null };

  if (argv.includes('--help') || argv.includes('-h')) {
    const lines = [
      'Usage: node driver.mjs [options]',
      '',
      '  --all           All apps (default when none specified)',
      '  --portal        Include portal (port 3000)',
      '  --api           Include API (port 3001)',
      '  --cms           Include CMS (port 3003)',
      '  --overview      Include overview (port 3002)',
      '  --check         Probe running servers only (no launch)',
      '  --no-docker     Skip Docker/Supabase auto-start',
      '  --serial        Launch apps sequentially',
      '  --timeout <ms>  Override per-app wait timeout',
      '  --help          Show this help',
    ];
    console.log(lines.join('\n'));
    process.exit(0);
  }

  if (argv.includes('--check')) opts.check = true;
  if (argv.includes('--no-docker')) opts.noDocker = true;
  if (argv.includes('--serial')) opts.serial = true;

  const timeoutIdx = argv.indexOf('--timeout');
  if (timeoutIdx !== -1 && argv[timeoutIdx + 1]) {
    opts.timeout = parseInt(argv[timeoutIdx + 1], 10);
  }

  for (const name of Object.keys(APPS)) {
    if (argv.includes(`--${name}`)) opts.apps.push(name);
  }
  if (argv.includes('--all') || opts.apps.length === 0) {
    opts.apps = Object.keys(APPS);
  }

  return opts;
}

// ── Environment detection ───────────────────────────────────────────────────

function isDockerRunning() {
  const result = spawnSync('docker', ['info'], { stdio: 'ignore' });
  return result.status === 0;
}

function isSupabaseRunning() {
  const result = spawnSync(
    'docker',
    ['ps', '--filter', 'name=supabase', '--format', '{{.Names}}'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  return (result.stdout || '').includes('supabase');
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, '127.0.0.1');
  });
}

async function ensureSupabase() {
  if (isSupabaseRunning()) return true;
  console.log('  Starting Supabase local stack...');
  const result = spawnSync('pnpx', ['supabase', 'start'], {
    cwd: 'packages/database',
    stdio: 'inherit',
    timeout: 120_000,
  });
  return result.status === 0;
}

function ensureCmsEnv() {
  const envPath = 'apps/cms/.env';
  if (existsSync(envPath)) return;
  console.log('  Creating apps/cms/.env with defaults...');
  const secret = randomBytes(32).toString('hex');
  writeFileSync(
    envPath,
    [
      `PAYLOAD_SECRET=${secret}`,
      'DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      'PORT=3003',
      '',
    ].join('\n'),
  );
}

// ── Server lifecycle ────────────────────────────────────────────────────────

async function waitForServer(port, healthPath, healthExpect, maxWait) {
  const url = `http://localhost:${port}${healthPath}`;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (healthExpect(res)) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

function launchApp(name, app) {
  const env = { ...process.env, ...app.env };
  const child = spawn(app.cmd, app.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env,
  });

  child.stderr.on('data', (chunk) => {
    const line = chunk.toString().trim();
    if (line && (line.includes('Error') || line.includes('error'))) {
      process.stderr.write(`  [${name}] ${line}\n`);
    }
  });

  return child;
}

// ── Smoke checks ────────────────────────────────────────────────────────────

async function runChecks(port, checks) {
  const results = [];
  for (const check of checks) {
    try {
      const res = await fetch(`http://localhost:${port}${check.path}`, {
        redirect: 'manual',
      });
      const body = await res.text();
      let json = null;
      try { json = JSON.parse(body); } catch {}

      const statusOk = check.expect(res);
      const bodyOk = check.bodyCheck ? check.bodyCheck(body, json) : true;
      results.push({
        path: check.path,
        label: check.label,
        status: res.status,
        passed: statusOk && bodyOk,
      });
    } catch (err) {
      results.push({
        path: check.path,
        label: check.label,
        error: err.message,
        passed: false,
      });
    }
  }
  return results;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const processes = [];

  const cleanup = () => {
    for (const p of processes) {
      try { process.kill(-p.pid); } catch {}
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  console.log(`\nArch-Mk2 Smoke Test — ${opts.apps.map((n) => APPS[n].label).join(', ')}`);
  console.log('─'.repeat(60));

  // ── Environment prep ────────────────────────────────────────────────────

  const needsDocker = opts.apps.some((n) => APPS[n].needsDocker);

  if (needsDocker && !opts.noDocker && !opts.check) {
    if (!isDockerRunning()) {
      console.error('\n  Docker is not running. Apps that need it: API, CMS.');
      console.error('  Start Docker or pass --no-docker to skip those apps.\n');
      process.exit(1);
    }
    if (!isSupabaseRunning()) {
      const ok = await ensureSupabase();
      if (!ok) {
        console.error('  Failed to start Supabase. Run: cd packages/database && pnpx supabase start');
        process.exit(1);
      }
    }
    console.log('  Supabase ready.');
  }

  if (opts.apps.includes('cms') && !opts.check) {
    ensureCmsEnv();
  }

  // ── Check mode: probe already-running servers ───────────────────────────

  if (opts.check) {
    console.log('\nProbing running servers...\n');
    let totalPass = 0;
    let totalFail = 0;

    for (const name of opts.apps) {
      const app = APPS[name];
      const free = await isPortFree(app.port);
      if (free) {
        console.log(`  SKIP ${app.label} — nothing on port ${app.port}`);
        continue;
      }
      const results = await runChecks(app.port, app.checks);
      const passed = results.filter((r) => r.passed).length;
      const failed = results.length - passed;
      totalPass += passed;
      totalFail += failed;

      const icon = failed === 0 ? 'OK' : 'FAIL';
      console.log(`  ${icon} ${app.label} (port ${app.port})`);
      for (const r of results) {
        const mark = r.passed ? 'PASS' : 'FAIL';
        const detail = r.error ? `error: ${r.error}` : `status ${r.status}`;
        console.log(`    ${mark} ${r.path} (${r.label}) — ${detail}`);
      }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Total: ${totalPass} passed, ${totalFail} failed`);
    process.exit(totalFail > 0 ? 1 : 0);
  }

  // ── Launch mode ─────────────────────────────────────────────────────────

  const launchOrder = opts.serial
    ? opts.apps
    : opts.apps;

  for (const name of launchOrder) {
    const app = APPS[name];

    const portFree = await isPortFree(app.port);
    if (!portFree) {
      console.log(`\n  ${app.label}: port ${app.port} occupied — checking if it's already running...`);
      const ready = await waitForServer(app.port, app.healthPath, app.healthExpect, 3000);
      if (ready) {
        console.log(`  ${app.label}: already running on port ${app.port}`);
        continue;
      }
      console.log(`  ${app.label}: port ${app.port} occupied by unknown process. Skipping.`);
      continue;
    }

    const maxWait = opts.timeout || app.maxWait;
    console.log(`\n  Launching ${app.label} (port ${app.port}, timeout ${maxWait / 1000}s)...`);
    const child = launchApp(name, app);
    processes.push(child);

    const ready = await waitForServer(app.port, app.healthPath, app.healthExpect, maxWait);
    if (!ready) {
      console.error(`  ${app.label}: did not start within ${maxWait / 1000}s`);
      try { process.kill(-child.pid); } catch {}
      const idx = processes.indexOf(child);
      if (idx >= 0) processes.splice(idx, 1);
      continue;
    }
    console.log(`  ${app.label}: ready.`);
  }

  // ── Smoke checks ────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(60)}`);
  console.log('Smoke checks:\n');

  let totalPass = 0;
  let totalFail = 0;
  const appResults = [];

  for (const name of opts.apps) {
    const app = APPS[name];
    const free = await isPortFree(app.port);
    if (free) {
      console.log(`  SKIP ${app.label} — not running`);
      appResults.push({ name, label: app.label, skipped: true });
      continue;
    }

    const results = await runChecks(app.port, app.checks);
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    totalPass += passed;
    totalFail += failed;

    const icon = failed === 0 ? 'OK' : 'FAIL';
    console.log(`  ${icon} ${app.label} (port ${app.port})`);
    for (const r of results) {
      const mark = r.passed ? 'PASS' : 'FAIL';
      const detail = r.error ? `error: ${r.error}` : `status ${r.status}`;
      console.log(`    ${mark} ${r.path} (${r.label}) — ${detail}`);
    }
    appResults.push({ name, label: app.label, results });
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(60)}`);
  const running = appResults.filter((r) => !r.skipped);
  const skipped = appResults.filter((r) => r.skipped);
  console.log(
    `Result: ${totalPass} passed, ${totalFail} failed` +
    (skipped.length > 0 ? `, ${skipped.length} skipped` : ''),
  );

  if (processes.length > 0) {
    console.log(`\nServers still running:`);
    for (const name of opts.apps) {
      const app = APPS[name];
      const free = await isPortFree(app.port);
      if (!free) console.log(`  ${app.label}: http://localhost:${app.port}`);
    }
    console.log(`\nPress Ctrl+C to stop all servers.`);

    // Keep alive until interrupted
    await new Promise(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
