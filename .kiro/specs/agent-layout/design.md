# Design: agent-layout

## Problem

Cursor loads subagents only from **flat** `.cursor/agents/*.md` files. Skills use `skill-name/SKILL.md` folders. Agents needed the same collateral structure without breaking discovery.

## Solution: hybrid layout

```
.cursor/agents/
├── README.md
├── _shared/references/          # gold-standard-contract, agent-skills-runtime
├── <name>.md                    # ENTRY (Cursor discovery)
└── <name>/                      # COLLATERAL
    ├── references/
    ├── scripts/                 # optional (ai-docs-sync has inventory + verify)
    └── assets/                  # output templates
```

## Files created / changed

| Surface     | Path                                                        | Role                               |
| ----------- | ----------------------------------------------------------- | ---------------------------------- |
| Standard    | `.cursor/standards/agent-layout/STANDARD.md`                | Canonical layout doc               |
| Validator   | `.cursor/standards/agent-layout/scripts/validate-agents.sh` | Entry + collateral checks          |
| Meta-skill  | `.cursor/skills/agent-layout/`                              | Authoring + wrapper validate       |
| Shared refs | `.cursor/agents/_shared/references/`                        | Cross-agent contracts              |
| Redirects   | `.cursor/agents/references/*.md`                            | Back-compat symlinks-by-content    |
| Hooks doc   | `.cursor/hooks/README.md`                                   | Documents hooks surface            |
| Kiro        | `.kiro/agents/default.json` → `agents_layout` block         | Machine-readable inventory         |
| Compliance  | `16-agent-compliance.md`                                    | Hybrid layout + agent-layout skill |
| Routing     | `04-subagent-auto-routing.mdc`                              | Collateral column in inventory     |

## Per-agent collateral

| Agent                | references                           | assets           | scripts                   |
| -------------------- | ------------------------------------ | ---------------- | ------------------------- |
| fast-outliner        | speed-rules, handoff-routing         | OUTLINE-TEMPLATE | —                         |
| frontend-design      | composition-rules, anti-patterns     | DESIGN-BRIEF     | —                         |
| frontend-implementer | conventions                          | IMPLEMENT-REPORT | —                         |
| ai-docs-sync         | source-of-truth, audit-pipeline      | SYNC-REPORT      | inventory, verify-mirrors |
| sceptic              | review-lenses, adversarial-checklist | VERDICT          | —                         |
| idle-runner          | safe-work, unsafe-work               | IDLE-REPORT      | —                         |

## Runtime flow

```
Task match (04 routing) → read <name>.md entry
                      → load <name>/references/ on demand
                      → run <name>/scripts/ when workflow says so
                      → fill <name>/assets/ template
                      → Next owner line
```

## Validation integration

`agent-skills/scripts/validate.sh` calls `validate-agents.sh` after skill checks.

## Server/client / env

N/A — docs and AI surfaces only.

## New packages

None.
