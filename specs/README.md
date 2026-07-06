# Specifications (SDD Governance - L5)

This directory contains **specifications as source of truth BEFORE code**. Every feature, module, or significant change must have a corresponding spec document that defines:

- Objective: What we're building and why
- Success Criteria: How we know it's done (testable, verifiable)
- Implementation Plan: Ordered tasks with acceptance criteria
- Boundaries: What's always done, what needs approval, what's never done

## Spec Template

Each spec follows the SDD methodology:

```markdown
# Spec: [Feature Name]

## Objective

[What we're building, user stories, acceptance criteria]

## Tech Stack

[Framework, language, key dependencies]

## Commands

[Build, test, lint, dev — full commands with flags]

## Project Structure

[Directory layout with descriptions]

## Code Style

[Example snippet + conventions]

## Testing Strategy

[Framework, test locations, coverage expectations]

## Boundaries

- Always: [...]
- Ask first: [...]
- Never: [...]

## Success Criteria

[Specific, testable conditions]
```

## Spec Index

| Feature              | Spec File                                          | Status  |
| -------------------- | -------------------------------------------------- | ------- |
| Portal Core          | [portal-core.md](portal-core.md)                   | Active  |
| API Core             | [api-core.md](api-core.md)                         | Active  |
| Supabase Integration | [supabase-integration.md](supabase-integration.md) | Active  |
| DeepEval Integration | [deepeval-integration.md](deepeval-integration.md) | Planned |

## Related

- See [track-management/SKILL.md](../.agentic-tools-mcp/agents/skills/track-management/SKILL.md) for track lifecycle
- See [spec-driven-development/SKILL.md](../.agentic-tools-mcp/agents/skills/spec-driven-development/SKILL.md) for methodology
- Progress tracking in [../progress/](../progress/)
