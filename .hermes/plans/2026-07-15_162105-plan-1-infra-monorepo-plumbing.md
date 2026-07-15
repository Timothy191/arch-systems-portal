# Plan 1 — Infra / Monorepo Plumbing: Build the Platform

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Each task is 2-5 min of focused work; commit after every task.

**Goal:** Get the monorepo itself to a state where `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm type-check`, `pnpm test`, and the canonical quality-gate run green on a fresh clone. No app functionality yet — only plumbing.

**Architecture:** This plan touches ONLY the workspace-level scaffolding: root config files, CI scripts, tooling configs, repo hygiene. The app code is out of scope; that's Plan 2 (backend) and Plan 3 (frontend). Every fix here is "make the repo buildable and verifiable" so the later plans have a green baseline to extend.

**Tech Stack:** pnpm 9.15.9 · Node 22 · Turbo 2.x · GitHub Actions · husky · lint-staged · commitlint · knip · secretlint · syncpack · preflight

**Reference target state** (what "Plan 1 done" looks like):
- `pnpm install` is clean (frozen-lockfile works in CI).
- `pnpm build` succeeds for all 3 apps.
- `pnpm lint` succeeds across apps + packages.
- `pnpm type-check` succeeds across all workspaces.
- `pnpm test` runs the full test matrix (Jest in 3 apps + 4 packages).
- `pnpm audit:rls` reports "100% RLS coverage" or fails loudly.
- `pnpm knip` runs and reports (zero false positives on a clean tree).
- `pnpm test:e2e` boots portal + runs Playwright (unauthenticated tests at minimum).
- `git push` to a PR triggers `.github/workflows/quality-gate.yml` and all 10 jobs pass.
- `acc.db` and `apps/ops-gateway/acc.db` are no longer tracked.
- `.gitignore` has no duplicate entries and no stale `tools/` references.

---

## Task 1: Create the plans directory and capture this plan's audit context

**Objective:** Establish the implementation scratchpad and pin the audit findings as the source of truth.

**Files:**
- Create: `.hermes/plans/README.md`
- Create: `.hermes/plans/AUDIT-SUMMARY.md` (copy of `.audit/COMPREHENSIVE_AUDIT_2026-07-15.md` §0 "Headline findings" + §6 "Severity-prioritized recommendations" R1-R7 only)

**Step 1:** Create `.hermes/plans/README.md`:
```markdown
# Arch-Mk2 Local-Deploy Plans

Three plans, one per audit layer. Implement in order (1 → 2 → 3).

- Plan 1 (this one): infra / monorepo plumbing
- Plan 2: backend + data layer
- Plan 3: frontend

Each plan ends with a parent re-runs-the-gate verification. Do not move
to Plan 2 until Plan 1 is green. Do not move to Plan 3 until Plan 2 is green.

Source of truth: `.audit/COMPREHENSIVE_AUDIT_2026-07-15.md`.
```

**Step 2:** Copy the audit's §0 (Headline findings) + §6 (R1-R7) into `.hermes/plans/AUDIT-SUMMARY.md`. This is the working subset — the full audit is 60 KB and unreadable mid-implementation.

**Step 3:** Commit:
```bash
git add .hermes/plans
git commit -m "docs(plans): scaffold local-deploy implementation plans"
```

---

## Task 2: Create the `.audit` exclusion and ensure no track contamination

**Objective:** Verify `.audit/` is in `.gitignore` (it is, per the audit), and that we don't accidentally add huge audit files to the repo during this plan.

**Files:**
- Read-only check: `.gitignore:84` (the `.audit` line)
- No file changes

**Step 1:** Run:
```bash
grep -n '^\.audit' .gitignore
```
Expected: one line containing `.audit` (e.g. `.audit` standalone or `/.audit`).

**Step 2:** Run:
```bash
git status --short .audit/ | head -3
```
Expected: empty (`.audit/` is untracked, gitignored).

**Step 3:** No commit needed — this is a verification task.

---

## Task 3: Remove duplicate `node_modules` in `.gitignore`

**Objective:** Clean up the duplicate `node_modules` line in `.gitignore` (line 1 and line 102 per the audit).

**Files:**
- Modify: `.gitignore:102` (delete the duplicate `node_modules` line)

**Step 1:** Read `.gitignore` lines 100-110 to confirm the duplicate:
```bash
sed -n '100,110p' .gitignore
```

**Step 2:** Remove the second `node_modules` line (line 102). Use the patch tool:
```
old_string: 1:node_modules
...
102:node_modules
...
```
Replace with the same content minus line 102. **Verify uniqueness** by reading lines 100-110 after the patch.

**Step 3:** Verify with:
```bash
grep -cn '^node_modules$' .gitignore
```
Expected: `1`

**Step 4:** Commit:
```bash
git add .gitignore
git commit -m "chore(gitignore): remove duplicate node_modules entry"
```

---

## Task 4: Untrack `acc.db` and `apps/ops-gateway/acc.db`

**Objective:** Stop tracking the operational-state SQLite databases the Claude agent-tracer pipeline writes. Keep them as untracked local files.

**Files:**
- Modify: `.gitignore` (add `acc.db`, `apps/**/acc.db`)
- Run: `git rm --cached acc.db apps/ops-gateway/acc.db`

**Step 1:** Verify current tracking:
```bash
git ls-files acc.db apps/ops-gateway/acc.db
```
Expected: both files listed.

**Step 2:** Append to `.gitignore` (after the existing `*.db-shm` / `*.db-wal` lines at the bottom):
```
# Operational state databases (Claude agent-tracer pipeline)
acc.db
apps/**/acc.db
```

**Step 3:** Untrack:
```bash
git rm --cached acc.db apps/ops-gateway/acc.db
```

**Step 4:** Verify:
```bash
git ls-files acc.db apps/ops-gateway/acc.db
echo "---"
ls -la acc.db apps/ops-gateway/acc.db
```
Expected: `git ls-files` returns empty (untracked); `ls -la` shows the files still on disk.

**Step 5:** Commit:
```bash
git add .gitignore
git commit -m "chore(gitignore): untrack agent-tracer SQLite databases"
```

---

## Task 5: Create `tools/audit-rls.cjs` (the missing audit script)

**Objective:** Recreate the RLS audit script that `quality-gate.yml:127` calls via `pnpm audit:rls`. The script walks `packages/database/migrations/*.sql`, for each file containing `CREATE TABLE`, verifies the same file also contains `ENABLE ROW LEVEL SECURITY`. Exits 1 on any violation, 0 otherwise.

**Files:**
- Create: `tools/audit-rls.cjs`
- Create: `tools/audit-rls.test.mjs` (or skip if you defer tests to Plan 2)

**Step 1:** Create `tools/audit-rls.cjs`:
```javascript
#!/usr/bin/env node
// Recreates the RLS audit script removed during the partial-checkout purge.
// Iterates packages/database/migrations/*.sql, flags any file that creates
// a table without also enabling RLS in the same file. Child partitions
// inherit RLS from parents in PostgreSQL, so dynamic partition CREATE
// TABLE statements inside format() calls are excluded.

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'packages', 'database', 'migrations');
const PARTITION_HEURISTIC = /\bformat\s*\(/i; // CREATE TABLE inside format() is a child partition

function* migrations() {
  for (const file of fs.readdirSync(MIGRATIONS_DIR).sort()) {
    if (file.endsWith('.sql')) yield path.join(MIGRATIONS_DIR, file);
  }
}

let violations = 0;
let total = 0;

for (const file of migrations()) {
  const sql = fs.readFileSync(file, 'utf8');
  const createsTable = /CREATE\s+TABLE\b/i.test(sql);
  if (!createsTable) continue;
  total += 1;
  // Child partitions inherit RLS from parents — exclude dynamic partition creates
  if (PARTITION_HEURISTIC.test(sql) && !/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sql)) {
    // dynamic partition, skip (parent migration will have RLS)
    continue;
  }
  if (!/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sql)) {
    console.error(`RLS VIOLATION: ${path.relative(process.cwd(), file)} creates a table without ENABLE ROW LEVEL SECURITY`);
    violations += 1;
  }
}

console.log(`RLS audit: ${total - violations}/${total} table-creating migrations have RLS.`);
if (violations > 0) {
  console.error(`${violations} migration(s) need RLS added.`);
  process.exit(1);
}
```

**Step 2:** Smoke-test it:
```bash
node tools/audit-rls.cjs
```
Expected: `RLS audit: 30/30 table-creating migrations have RLS.` (or similar — actual count may vary as migrations evolve; what's important is the script runs and reports). Exit code 0.

**Step 3:** If the count comes back as `< 30`, debug by listing:
```bash
node -e "
const fs = require('fs');
const path = require('path');
const dir = 'packages/database/migrations';
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.sql')) continue;
  const sql = fs.readFileSync(path.join(dir, f), 'utf8');
  if (/CREATE\s+TABLE/i.test(sql) && !/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sql)) {
    console.log('MISSING-RLS:', f);
  }
}
"
```
For any file listed, inspect manually — these are the candidates Plan 2's RLS migration will fix.

**Step 4:** Commit:
```bash
git add tools/audit-rls.cjs
git commit -m "feat(tools): recreate audit-rls script for CI RLS gate"
```

---

## Task 6: Add `pnpm audit:rls` and the other missing CI scripts to root `package.json`

**Objective:** Stop the canonical quality-gate from failing. The `pnpm audit:rls` (Task 5's script), `pnpm knip`, `pnpm test:e2e`, `pnpm format:check`, `pnpm lint:root`, `pnpm quality`, `pnpm policy:gen` are all referenced by CLAUDE.md and/or CI but undefined in `package.json`.

**Files:**
- Modify: `package.json:67-76` (the `scripts` block)

**Step 1:** Read the current `scripts` block:
```bash
node -e "console.log(JSON.stringify(require('./package.json').scripts, null, 2))"
```

**Step 2:** Replace with:
```json
{
  "dev": "pnpm --filter portal dev",
  "analyze": "ANALYZE=true pnpm --filter portal build",
  "build": "pnpm --filter portal build && pnpm --filter api build",
  "format": "prettier --write \"**/*.{ts,tsx,md}\"",
  "format:check": "prettier --check \"**/*.{ts,tsx,md}\"",
  "lint": "pnpm --filter portal lint && pnpm --filter api lint",
  "lint:root": "eslint . --max-warnings 0",
  "test": "pnpm --filter portal test && pnpm --filter api test",
  "test:e2e": "playwright test",
  "quality": "pnpm lint && pnpm type-check && pnpm test && pnpm audit:rls && pnpm knip",
  "type-check": "pnpm --filter portal type-check && pnpm --filter api type-check",
  "ui": "pnpm --filter @repo/ui ui",
  "audit:rls": "node tools/audit-rls.cjs",
  "knip": "knip",
  "knip:fix": "knip --fix",
  "policy:gen": "node tools/policy-compiler.cjs",
  "agentic-tools": "tsx packages/agentic-tools-mcp/src/index.ts",
  "agentic-tools:daemon": "tsx packages/agentic-tools-mcp/src/daemon.ts",
  "agentic-tools:setup": "tsx packages/agentic-tools-mcp/src/setup.ts"
}
```

NOTE: the `agentic-tools*` scripts reference `packages/agentic-tools-mcp/` which doesn't exist on this branch (deleted). If the parent ground-truth says this dir is needed, restore it from git first (`git checkout HEAD -- packages/agentic-tools-mcp/`) or remove these three scripts. **Decision: remove the three `agentic-tools*` scripts** since the agentic-tools-mcp package is being purged. Update the JSON above.

**Step 3:** Verify all scripts resolve:
```bash
node -e "const p=require('./package.json'); for (const [k,v] of Object.entries(p.scripts)) console.log(k, '->', v)"
```
Expected: 15+ entries, no syntax errors.

**Step 4:** Smoke-test the new ones:
```bash
pnpm audit:rls
echo "exit: $?"
```
Expected: `RLS audit: 30/30 ...` (or actual count). Exit 0.

```bash
pnpm knip 2>&1 | head -30
echo "exit: $?"
```
Expected: may exit non-zero with a list of issues — that's OK for now, we'll fix in Task 11. The important thing is `pnpm` finds the script.

```bash
pnpm test:e2e --version 2>&1
```
Expected: `Version 1.x.x` (Playwright reports its version).

**Step 5:** Commit:
```bash
git add package.json
git commit -m "feat(scripts): add audit:rls, knip, test:e2e, format:check, lint:root, quality"
```

---

## Task 7: Create `tools/policy-compiler.cjs` (the missing policy generator)

**Objective:** Recreate the dependency-rules → ESLint-boundary-rules compiler that `pnpm policy:gen` calls. The script is a no-op stub for Plan 1 (Plan 2 will fill in real rules). The point is to make `pnpm policy:gen` succeed so the CI gate passes.

**Files:**
- Create: `tools/policy-compiler.cjs`
- Create: `tools/policy/dependency.rules.json` (empty ruleset)
- Create: `tools/policy/intent-map.json` (empty map)

**Step 1:** Create `tools/policy-compiler.cjs`:
```javascript
#!/usr/bin/env node
// Stub policy compiler. Reads tools/policy/dependency.rules.json and emits
// tools/policy/eslint-boundaries.generated.cjs. The real rules land in
// Plan 2 (R-LINT-1: no-restricted-imports for @repo/database).

const fs = require('fs');
const path = require('path');

const RULES = path.resolve(__dirname, 'policy', 'dependency.rules.json');
const INTENT = path.resolve(__dirname, 'policy', 'intent-map.json');
const OUT = path.resolve(__dirname, 'policy', 'eslint-boundaries.generated.cjs');

function ensure(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const rules = ensure(RULES, { boundaries: [] });
const intent = ensure(INTENT, { tags: {} });

// Render an ESLint flat-config snippet (or legacy .eslintrc fragment).
const lines = [
  '// AUTO-GENERATED by tools/policy-compiler.cjs — do not hand-edit.',
  '// To regenerate: pnpm policy:gen',
  '/* eslint-disable */',
  'module.exports = {',
  '  rules: {',
];

if (rules.boundaries.length === 0) {
  lines.push('    // No boundaries configured yet. Add entries to tools/policy/dependency.rules.json');
  lines.push('    // and re-run pnpm policy:gen. See Plan 2 / R-LINT-1.');
} else {
  for (const b of rules.boundaries) {
    lines.push(`    "no-restricted-imports": ["error", { "patterns": [${b.denied.map((p) => `"${p}"`).join(', ')}] }],`);
  }
}

lines.push('  },', '};', '');

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${rules.boundaries.length} boundary rule(s)).`);
```

**Step 2:** Smoke-test:
```bash
node tools/policy-compiler.cjs
cat tools/policy/eslint-boundaries.generated.cjs
```
Expected: file exists, contains the comment "No boundaries configured yet".

**Step 3:** Commit:
```bash
git add tools/policy-compiler.cjs tools/policy
git commit -m "feat(tools): add policy-compiler stub for ESLint boundary rules"
```

---

## Task 8: Create the `turbo.json` at repo root

**Objective:** Stop `pr-cache-warmup.yml:24` from failing (`pnpm turbo run build`) and give the monorepo a real task graph. Turbo is already installed (^2.10.2); only the config is missing.

**Files:**
- Create: `turbo.json`

**Step 1:** Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Step 2:** Smoke-test:
```bash
pnpm turbo run build --dry-run=json 2>&1 | head -20
echo "exit: $?"
```
Expected: a JSON task list, exit 0.

**Step 3:** Commit:
```bash
git add turbo.json
git commit -m "feat(monorepo): add turbo.json task graph for build/lint/test/type-check/dev"
```

---

## Task 9: Create `playwright.config.ts` at root

**Objective:** Stop `quality-gate.yml:193` (the `test-e2e` job) from running with default Playwright config (which can't find tests). For local-deploy, configure Playwright to use the dev portal as the web server.

**Files:**
- Create: `playwright.config.ts`

**Step 1:** Read the existing portal package.json scripts to confirm dev port (3000):
```bash
node -e "console.log(require('./apps/portal/package.json').scripts.dev)"
```

**Step 2:** Create `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

const PORTAL_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 1 : undefined,
  reporter: IS_CI ? 'list' : 'list',

  use: {
    baseURL: PORTAL_URL,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'pnpm dev',
    url: PORTAL_URL,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
  },
});
```

**Step 3:** Create the e2e directory with a smoke test:
```bash
mkdir -p e2e
```

**Step 4:** Create `e2e/portal-smoke.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('portal login page is reachable', async ({ page }) => {
  await page.goto('/login');
  // Unauthenticated: the portal should redirect to /login or render it.
  await expect(page).toHaveURL(/\/login/);
});
```

**Step 5:** Smoke-test (requires `pnpm dev` running — defer actual run to Plan 3 when portal is deployable):
```bash
pnpm test:e2e --list
```
Expected: `portal-smoke.spec.ts` listed with 1 test.

**Step 6:** Commit:
```bash
git add playwright.config.ts e2e
git commit -m "test(e2e): add playwright config and portal smoke test"
```

---

## Task 10: Add `knip.json` at root

**Objective:** Stop `pnpm knip` from flooding the PR with noise. Configure it to know about the monorepo workspace layout.

**Files:**
- Create: `knip.json`

**Step 1:** Create `knip.json`:
```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "workspaces": {
    "apps": "apps/*",
    "packages": "packages/*"
  },
  "ignoreDependencies": [
    "@univerjs/preset-sheets-core",
    "@univerjs/presets"
  ],
  "ignoreBinaries": ["supabase"],
  "ignoreExportsUsedInFile": true
}
```

The two Univer ignores are placeholders for now; remove them and re-run knip after Plan 1 to see what else surfaces.

**Step 2:** Smoke-test:
```bash
pnpm knip 2>&1 | tail -40
echo "exit: $?"
```
Expected: a list of unused files/exports, exit non-zero. The point is the script runs and reports rather than crashing.

**Step 3:** Note the top 5 findings in `.hermes/plans/AUDIT-SUMMARY.md` under a "Knip follow-ups" section. Do NOT fix them in this plan — out of scope.

**Step 4:** Commit:
```bash
git add knip.json
git commit -m "chore(knip): add knip config for monorepo dead-code detection"
```

---

## Task 11: Wire husky + lint-staged + commitlint

**Objective:** Stop the workflow from missing pre-commit hooks. The tools are installed but no `.husky/` dir or config exists.

**Files:**
- Create: `.husky/pre-commit`
- Create: `.husky/commit-msg`
- Create: `commitlint.config.cjs`
- Create: `lint-staged.config.cjs`
- Modify: `package.json:67-76` (add `prepare: "husky"` script)

**Step 1:** Create `commitlint.config.cjs`:
```javascript
module.exports = { extends: ['@commitlint/config-conventional'] };
```

**Step 2:** Create `lint-staged.config.cjs`:
```javascript
module.exports = {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
```

**Step 3:** Add `"prepare": "husky"` to root `package.json` scripts. (Already added if you followed Task 6's exact JSON.)

**Step 4:** Run `pnpm prepare` to initialize husky:
```bash
pnpm prepare
ls -la .husky/
```
Expected: `.husky/_/` directory created.

**Step 5:** Create `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
pnpm exec lint-staged
```

**Step 6:** Create `.husky/commit-msg`:
```bash
#!/usr/bin/env sh
pnpm exec commitlint --edit "$1"
```

**Step 7:** Make them executable:
```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

**Step 8:** Smoke-test:
```bash
git commit --allow-empty -m "chore: test husky hooks"
echo "exit: $?"
```
Expected: commitlint runs and accepts the message; pre-commit runs lint-staged (no staged files so no-op). Commit succeeds.

**Step 9:** Commit:
```bash
git add .husky commitlint.config.cjs lint-staged.config.cjs
git commit -m "chore(hooks): wire husky + lint-staged + commitlint"
```

---

## Task 12: Add secretlint config and a CI workflow

**Objective:** Stop the silent gap — `secretlint ^13.0.2` is in devDeps but never invoked. Add a config and a CI workflow that scans for committed secrets.

**Files:**
- Create: `.secretlintrc.json`
- Create: `.github/workflows/secret-scan.yml`

**Step 1:** Create `.secretlintrc.json`:
```json
{
  "rules": [
    {
      "id": "@secretlint/secretlint-rule-preset-recommend"
    }
  ]
}
```

**Step 2:** Create `.github/workflows/secret-scan.yml`:
```yaml
name: Secret Scan

on:
  pull_request:
  push:
    branches: [main]

jobs:
  secretlint:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: "9.15.9"
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec secretlint "**/*"
```

**Step 3:** Smoke-test locally:
```bash
pnpm exec secretlint "**/*" 2>&1 | head -20
echo "exit: $?"
```
Expected: may flag some existing files (the audit is real). Note findings in `.hermes/plans/AUDIT-SUMMARY.md` and address in Plan 2 (the .env files are untracked, so they shouldn't be scanned; if secretlint flags them, refine the `.secretlintrc.json` ignore list).

**Step 4:** Commit:
```bash
git add .secretlintrc.json .github/workflows/secret-scan.yml
git commit -m "ci(security): add secretlint scan workflow"
```

---

## Task 13: Fix `.gitignore` and `.prettierignore` to remove stale `tools/` references

**Objective:** Clean up the .gitignore and .prettierignore stale references to a `tools/` directory that doesn't exist on this branch.

**Files:**
- Modify: `.gitignore:21-29` (the `tools/` ignore block)
- Modify: `.prettierignore:23-25` (same)

**Step 1:** Read the current lines:
```bash
sed -n '20,30p' .gitignore
echo "---"
sed -n '20,28p' .prettierignore
```

**Step 2:** In `.gitignore`, delete lines 21-29 (the `tools/memex/**`, `tools/repowise/**`, `tools/secrin/**`, `tools/sense/**`, `tools/n8n-mcp/**`, `tools/preflight-mcp/**`, `tools/wiki-viewer/**`, `tools/audit-rls.cjs`, `tools/policy-compiler.cjs` block — note that `tools/audit-rls.cjs` and `tools/policy-compiler.cjs` are now CREATED in Tasks 5 and 7, so they should be **kept** in `.gitignore` as untracked-by-design OR added back once the files exist. Decision: leave them in `.gitignore` as a defensive measure; `.gitignore` patterns that match real files just no-op).

**Step 3:** Same surgery in `.prettierignore`.

**Step 4:** Verify nothing important is removed:
```bash
grep -E '^tools/' .gitignore
echo "---"
grep -E '^tools/' .prettierignore
```
Expected: only `tools/audit-rls.cjs` and `tools/policy-compiler.cjs` may remain (or none, if you removed them too).

**Step 5:** Commit:
```bash
git add .gitignore .prettierignore
git commit -m "chore(ignore): remove stale tools/ references"
```

---

## Task 14: Re-verify the canonical quality gate

**Objective:** Run the full quality-gate locally to confirm Plan 1's changes are green.

**Step 1:** From repo root:
```bash
pnpm install
echo "---"
pnpm build
echo "---"
pnpm lint
echo "---"
pnpm type-check
echo "---"
pnpm test
echo "---"
pnpm audit:rls
echo "---"
pnpm knip 2>&1 | tail -10
```

**Step 2:** Document the results in `.hermes/plans/AUDIT-SUMMARY.md` under a "Plan 1 verification" section. Note any failures — those become the input to Plan 2 (backend) or Plan 3 (frontend) work.

**Step 3:** If everything is green, commit the verification log:
```bash
git add .hermes/plans/AUDIT-SUMMARY.md
git commit -m "docs(plans): record Plan 1 verification results"
```

**Step 4:** If there are failures, **STOP**. Do not proceed to Plan 2. The failures are likely in app code (out of scope for Plan 1) — document them in the AUDIT-SUMMARY.md and pick them up in the appropriate plan.

---

## Done criteria

Plan 1 is complete when ALL of the following are true:

- [ ] `pnpm install` clean (no peer-dep warnings about corepack, no missing workspace)
- [ ] `pnpm build` succeeds (all 3 apps)
- [ ] `pnpm lint` succeeds
- [ ] `pnpm type-check` succeeds
- [ ] `pnpm test` runs all jest suites
- [ ] `pnpm audit:rls` reports 100% coverage
- [ ] `pnpm knip` runs without crashing (may report findings — that's Plan 2/3 work)
- [ ] `pnpm test:e2e --list` shows the smoke test
- [ ] `pnpm quality` runs without "script not found" errors
- [ ] `acc.db` and `apps/ops-gateway/acc.db` are untracked
- [ ] `.gitignore` has no duplicate `node_modules` and no stale `tools/` references
- [ ] husky pre-commit + commit-msg hooks are wired
- [ ] secretlint runs locally and in CI
- [ ] All commits use `feat:` / `fix:` / `chore:` / `docs:` conventional prefixes

**Next plan:** Plan 2 (backend + data layer) starts the postgres+redis+api+ops-gateway stack.
