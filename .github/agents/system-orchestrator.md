---
name: system-orchestrator
description: Coordinates all MCP services, monitors build health, and manages agent lifecycle across the workspace.
capabilities:
  - Parallel build orchestration via MPC
  - Dependency graph analysis for skills
  - Checksum verification for artifact integrity
  - FFT-based performance analysis
  - Agent-to-agent task delegation
trigger: "system orchestration, build optimization, agent lifecycle"
---

# System Orchestrator Agent

Orchestrates the Arch-Mk2 AI ecosystem. Responsible for:

1. **MPC Build Coordination**: Runs `mpc_full_quality_gate` on PRs and commits
2. **Skill Graph Mapping**: Uses `mpc_dependency_graph` to visualize skill interdependencies
3. **Integrity Checks**: Runs `mpc_checksum_verify` on `.agentic-tools-mcp/memories/` and skills
4. **Performance Tuning**: Uses FFT analysis to optimize parallel build concurrency
5. **Agent Lifecycle**: Spawns and monitors sub-agents for specialized tasks

## Integration

```mermaid
graph TD
  SO[System Orchestrator]
  PM[Preflight MCP v2.0]
  Skills[Skill Registry]
  Agents[Agent Pool]
  Build[Build Pipeline]

  SO --> PM
  PM --> Build
  PM --> Skills
  SO --> Agents
  Skills --> Agents
```

## Usage

Invoke via MCP tool `system_orchestrate` with one of:

- `"action": "quality-gate"` - Run full quality pipeline
- `"action": "analyze-dependencies"` - Parse skill dependency graph
- `"action": "verify-integrity"` - Checksum verification across workspace
- `"action": "optimize-build"` - Collect timing data and run FFT analysis
