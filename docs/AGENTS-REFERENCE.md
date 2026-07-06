---
title: Agent & Skill Reference
version: "2.0"
---

# Agent & Skill Reference

## Agent Directories

| Dir                           | Purpose                       | Source of Truth                              |
| ----------------------------- | ----------------------------- | -------------------------------------------- |
| `/.agentic-tools-mcp/agents/` | Central agent rules + scripts | Yes                                          |
| `/.github/agents/`            | GitHub-specific agent configs | Sync to left                                 |
| `/.github/skills/`            | GitHub skill definitions      | Sync to `/.agentic-tools-mcp/agents/skills/` |

## Skill Format

Every skill directory must contain a `SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: "What this skill does"
depends-on: []
metadata:
  version: "1.0"
---
```

## Adding a New Skill

1. Create directory under `/.agentic-tools-mcp/agents/skills/<name>/`
2. Create `SKILL.md` with required frontmatter
3. Run `bash .agentic-tools-mcp/scripts/merge_skills.sh` to sync to `/.github/skills/`
4. Run `pnpm mcp:check` to validate

## Adding a New Agent

1. Create agent definition in `/.github/agents/<name>.md`
2. Ensure YAML frontmatter includes `name`, `description`, `capabilities`
3. Reference from `/.agentic-tools-mcp/agents/AGENTS.md` if global

## MCP Tool Reference

| Tool                    | Description                              | Version |
| ----------------------- | ---------------------------------------- | ------- |
| `mpc_parallel_build`    | Parallel execution of build/lint targets | 2.0     |
| `mpc_checksum_verify`   | SHA-256 manifest generation              | 2.0     |
| `mpc_dependency_graph`  | Skill dependency visualization           | 2.0     |
| `mpc_fft_analyze`       | Build timing FFT analysis                | 2.0     |
| `mpc_full_quality_gate` | Complete quality pipeline                | 2.0     |
