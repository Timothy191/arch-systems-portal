# Agent Directive Files — Complete Inventory

**Date**: 2026-07-06
**Context**: All files that provide instructions, rules, or context to AI agents

## Project-Level Directives (in repo root)

| File                              | Target Agent                        | Size                        | Purpose                                                                                                        |
| --------------------------------- | ----------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                       | Claude Code                         | ~18.8KB                     | Canonical repo guidance: commands, architecture, critical rules, Repowise workspace section, Sense index usage |
| `AGENTS.md`                       | All agents (Qoder, Claude, Copilot) | ~3.2KB                      | High-level rules: data access, Next.js 16 conventions, AGENT_TRACER protocol, RLS, documentation sync          |
| `GEMINI.md`                       | Gemini / Antigravity                | Mirrors CLAUDE.md/AGENTS.md | Same content adapted for Gemini models                                                                         |
| `.github/copilot-instructions.md` | GitHub Copilot                      | Project context             | Commands, critical rules, architecture notes for Copilot                                                       |
| `.cursor/rules/arch-systems.md`   | Cursor IDE                          | Project rules               | Non-negotiable rules, architecture notes for Cursor                                                            |

## Workspace-Level Directives

| File                | Target Agent                                              | Purpose                                                                                                                                            |
| ------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.agents/AGENTS.md` | All AI agents (Antigravity, Cline, Roo Code, Claude Code) | 8-section workspace rules: DB security, Git, Nx, codebase intelligence, editor configs, Qoder integration, memory protocol, systematic improvement |

## AGENT_TRACER.md Files (17 total)

Per-app/package trace logs recording AI agent interventions:

**Apps (4):**

- `apps/portal/AGENT_TRACER.md`
- `apps/api/AGENT_TRACER.md`
- `apps/cms/AGENT_TRACER.md`
- `apps/overview/AGENT_TRACER.md`

**Packages (12):**

- `packages/database/AGENT_TRACER.md`
- `packages/errors/AGENT_TRACER.md`
- `packages/eslint-config/AGENT_TRACER.md`
- `packages/eval/AGENT_TRACER.md`
- `packages/rate-limiter/AGENT_TRACER.md`
- `packages/redis/AGENT_TRACER.md`
- `packages/supabase/AGENT_TRACER.md`
- `packages/theme/AGENT_TRACER.md`
- `packages/typescript-config/AGENT_TRACER.md`
- `packages/ui/AGENT_TRACER.md`
- `packages/utils/AGENT_TRACER.md`

**Tools (1):**

- `tools/n8n-mcp/AGENT_TRACER.md`

**Docs (1):**

- `docs/AGENT_TRACER.md`

## Home-Level Directives

| File                  | Target               | Purpose                                                                                                        |
| --------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `~/.claude/CLAUDE.md` | Claude Code (global) | trace-mcp tool routing table (16 tools: search, get_outline, get_symbol, get_change_impact, find_usages, etc.) |

## .agents/ Automation Scripts

| Script                              | Purpose                                          |
| ----------------------------------- | ------------------------------------------------ |
| `.agents/scripts/generate_skill.sh` | Synthesize reusable skills from solved workflows |
| `.agents/scripts/add_rule.sh`       | Inject repository-wide rules into global rules   |
