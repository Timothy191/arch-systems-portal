# AI System — Design

## Command

`scripts/ai.sh` — single orchestrator. `package.json` exposes `pnpm ai` (+ aliases).

## Modes

| Mode      | Phases                                                |
| --------- | ----------------------------------------------------- |
| `init`    | restore → sync → guardrails → layout → dedupe → drift |
| `fix`     | same as init                                          |
| `check`   | guardrails → layout → dedupe → drift (no writes)      |
| `status`  | inventory → guardrails → layout → dedupe → drift      |
| `onboard` | checklist + inventory + guardrails                    |

## Background agent

`ai-maintenance-checker` defaults to `pnpm ai check` (read-only). `pnpm ai fix` only on explicit init/fix or user request.

## Merged scripts

All legacy entry points delegate to `pnpm ai check` or call `scripts/ai.sh` directly.
