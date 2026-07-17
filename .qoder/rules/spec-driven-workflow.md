---
description: Spec-driven workflow enforcement for agent tasks
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.md"]
---

# Spec-Driven Workflow Enforcement

## Rule: Multi-File Changes Require Specs

Any change that affects more than one file must follow the three-phase spec-driven workflow documented in `AGENTS.md` §1.

### Phase Requirements

**Phase 1 — Requirements (`requirements.md`)**
- Must exist in `.kiro/specs/{feature-slug}/requirements.md`
- Must contain numbered, testable acceptance criteria
- Must identify ambiguities requiring user clarification
- Must define scope boundaries (in/out of scope)

**Phase 2 — Design (`design.md`)**
- Must exist in `.kiro/specs/{feature-slug}/design.md`
- Must describe architecture and data flow
- Must map server vs client boundaries explicitly
- Must list files to create/modify
- Must document environment variables and new packages
- Must get user sign-off before implementation

**Phase 3 — Tasks (`tasks.md`)**
- Must exist in `.kiro/specs/{feature-slug}/tasks.md`
- Must break design into smallest independently-testable units
- Must order tasks with dependencies
- Must mark tasks complete only after `pnpm quality` passes
- Must never skip tasks

### Enforcement

**Pre-Change Check**
1. If more than one `.ts/.tsx/.js/.jsx` file is being modified/created
2. Check if `.kiro/specs/{feature-slug}/` exists
3. Check if `requirements.md`, `design.md`, `tasks.md` exist
4. If missing → BLOCK change with instruction to create specs first

**During Implementation**
1. Each task must be marked complete individually
2. `pnpm quality` must pass before marking task complete
3. Commit messages must reference spec task IDs
4. Changes must align with approved design

**Post-Implementation**
1. All acceptance criteria must be verified
2. All tasks must be marked complete
3. Spec files must be updated with implementation notes
4. `pnpm quality` must pass on final state

### Exceptions

**Single-File Changes**
- Bug fixes affecting single file
- Documentation updates
- Configuration tweaks
- Minor refactors within single component

**Emergency Hotfixes**
- Critical production issues
- Must be followed by retrospective spec creation
- Limited to minimal changes

## Agent Configuration Reference

Agents must use `.kiro/agents/default.json` configuration which enforces:
- Spec-driven workflow for multi-file changes
- AGENTS.md rule compliance
- Technology stack adherence
- Monorepo layout constraints

## Templates

Use templates from `.kiro/templates/`:
- `requirements.md` template
- `design.md` template  
- `tasks.md` template

Copy to `.kiro/specs/{feature-slug}/` and fill according to AGENTS.md guidelines.

## Quality Gates

Before marking any task complete:
1. `pnpm quality` must pass (lint + type-check + test + format)
2. No TypeScript `any` types introduced
3. No secrets committed or exposed
4. Server/client boundaries respected
5. All new environment variables in `.env.example`
6. Error handling uses `@repo/errors` AppError subclasses
7. Accessibility requirements met

## Example Workflow

```
.kiro/specs/feature-auth/
├── requirements.md  # Phase 1: Requirements & acceptance criteria
├── design.md         # Phase 2: Architecture & implementation plan  
└── tasks.md         # Phase 3: Step-by-step tasks with quality gates
```

See `.kiro/specs/portal-migration/` for a complete example.