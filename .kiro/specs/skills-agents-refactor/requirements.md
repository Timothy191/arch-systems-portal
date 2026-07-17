# Requirements: skills-agents-refactor

## Intent

Consolidate duplicate AI workflow surfaces and refine project agents/skills so each produces gold-standard, handoff-ready output (~29% quality lift operationalized as clearer triggers, anti-triggers, tighter contracts, less overlap).

## Acceptance criteria

1. No agent merges of complementary roles (6 agents remain; roles disambiguated).
2. Every project agent `description` includes MUST auto-delegate + explicit anti-triggers.
3. Every project agent has a **Gold Standard Contract** (required output fields, evidence rule, Next owner line, fluff ban).
4. `sceptic` emits adversarial verdict + estimate only; **formal** Alignment Score owned by `agent-alignment-score` skill.
5. Qoder `verify` becomes a thin portal-mode alias of `quality` (single quality story).
6. `agent-alignment-score` skill upgraded with anti-triggers + gold output contract.
7. `04-subagent-auto-routing.mdc` inventory matches `.cursor/agents/` and includes anti-trigger column or equivalent.
8. `AGENTS.md` and `CLAUDE.md` gain a short pointer to project agents + routing (no policy fork).
9. Home `~/.agents/skills` and `~/.cursor/agents` remain out of scope.
10. `sceptic` reviews the refactor before claiming done; Alignment ≥ 80.

## Non-goals

- Merging frontend-design into frontend-implementer
- Cloning all Qoder skills into Cursor
- Rewriting InsForge / bug-hunter home skills
- Softening AGENTS.md §18
