# ai-docs-sync Live Audit — agent-layout

**Date:** 2026-07-18  
**Pipeline:** INVENTORY → VERIFY (per `ai-docs-sync/references/audit-pipeline.md`)

## Commands run

```bash
.cursor/agents/ai-docs-sync/scripts/inventory.sh
.cursor/agents/ai-docs-sync/scripts/verify-mirrors.sh
```

## Inventory summary

| Surface               | Count (sample)                                              |
| --------------------- | ----------------------------------------------------------- |
| Agent entries         | 6 (`*.md` at `.cursor/agents/`)                             |
| Agent collateral dirs | 6 + `_shared/`                                              |
| Cursor skills         | 3 (`agent-alignment-score`, `skill-layout`, `agent-layout`) |
| Standards             | `agent-layout/`, `agent-skills/` (16 refs)                  |
| Rules                 | 6 `.mdc` files                                              |
| Hooks                 | `hooks.json` + 2 `.mjs` + README                            |
| Kiro                  | `default.json` with `agents_layout` block                   |

Full file list: run `inventory.sh` (80+ AI-surface paths).

## Verify results

### Never-do spot check

PASS — `pnpm 9`, `"use client"` layout bans present in AGENTS.md, CLAUDE.md, `.cursor/rules`, `.qoder/rules`.

### Layout validators

| Script                             | Result                                                  |
| ---------------------------------- | ------------------------------------------------------- |
| `validate-agents.sh`               | **0 errors** — all 6 entries ≤65 lines, hooks + Kiro OK |
| `agent-skills/scripts/validate.sh` | **0 errors, 0 warnings** — skills + agents              |

## Drift check

| Item                                 | Status                                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| Gold contract path                   | OK — `_shared/references/gold-standard-contract.md`        |
| Legacy redirect                      | OK — `.cursor/agents/references/gold-standard-contract.md` |
| Skills runtime on all agents         | OK — 6/6 entries link `agent-skills-runtime.md`            |
| Kiro `agents_layout.inventory`       | OK — matches 6 agent names                                 |
| `agent-layout` meta-skill `scripts/` | OK — wrapper present                                       |

## Severity

No **critical** or **warn** findings.

## Next owner

`parent` — spec complete; use `agent-layout` meta-skill when adding agents.
