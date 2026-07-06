# Memory Log: Kilo Code (.kilo) System Scan & Integration

## 1. Overview
As part of auditing the developer tool configs and AI assistant environment, we scanned the system globally for all configurations, agents, skills, and model provider plugins associated with Kilo Code (`kilocode` / `.kilo`). Kilo Code is a model gateway and agent environment running alongside other tools like Claude Code and VS Code extensions.

This log documents Kilo Code's locations, files, and how it is integrated into the workspace.

## 2. Global Configurations and Paths

### A. VS Code Extension
- **Path**: `/home/timothy/.antigravity-ide/extensions/kilocode.kilo-code-7.4.1-linux-x64`
- **Executables**: Includes `/bin/kilo` and `/bin/kilo-sandbox-mutation-worker.js`.

### B. Global Settings
- **Path**: `/home/timothy/.config/kilo/`
  - [kilo.json](file:///home/timothy/.config/kilo/kilo.json): Configures global remote and local MCP servers.
    - `airbyte-knowledge-mcp`: type `remote` (`https://airbyte.mcp.kapa.ai`)
    - `context7`: type `local` (`npx -y @upstash/context7-mcp`)
    - `playwright`: type `local` (`npx -y @playwright/mcp@0.0.38`)
    - `time`: type `local` (`uvx mcp-server-time`)
  - [kilo.jsonc](file:///home/timothy/.config/kilo/kilo.jsonc): Grants permissions (e.g., `"permission": { "bash": "allow" }`).

### C. Global Skills
- **Path**: `/home/timothy/.kilo/skills/` (also holds Node dependencies in `/home/timothy/.kilo/node_modules/`).
- **Skills Available**:
  - `integrate-anything`: Patterns for integrating third-party tools/packages.
  - `apollo-graphql`: Apollo Client and GraphQL API schemas.
  - `creating-data-lake-table`: AWS Athena/Glue DDL definition routines.
  - `agent-md-refactor`: Instruction set for refactoring codebase files.
  - `adbc`: Arrow Database Connectivity drivers and connection configurations.
  - `dashboarding`: Dashboard visualization and metrics tracking.

### D. SQLite State Database
- **Path**: `/home/timothy/.local/share/kilo/kilo.db` (along with `-wal` and `-shm` write-ahead logs), storing local memory state and context keys.

## 3. Project-Specific Configurations

Under the workspace root [Arch-Mk2](file:///home/timothy/Documents/Arch-Mk2/), Kilo Code is configured in the [.kilo/](file:///home/timothy/Documents/Arch-Mk2/.kilo/) directory:
- [kilo.json](file:///home/timothy/Documents/Arch-Mk2/.kilo/kilo.json): Enables the project-specific `sequentialthinking` MCP server via `npx -y @modelcontextprotocol/server-sequential-thinking`.
- [agents/code-reviewer.md](file:///home/timothy/Documents/Arch-Mk2/.kilo/agents/code-reviewer.md): Defines a custom agent mode named **Code Reviewer** focusing on code quality, security, performance, and maintainability.
- Contains its own `.gitignore`, `package.json` for npm packages, and a separate `node_modules/@kilocode` structure.

## 4. Model Provider Integrations

- **Hermes Agent integration**: 
  - **Path**: `/home/timothy/.hermes/hermes-agent/plugins/model-providers/kilocode/`
  - [plugin.yaml](file:///home/timothy/.hermes/hermes-agent/plugins/model-providers/kilocode/plugin.yaml) registers the `kilocode-provider` package.
  - [__init__.py](file:///home/timothy/.hermes/hermes-agent/plugins/model-providers/kilocode/__init__.py) maps the `kilocode` provider profile, pointing to the base gateway `https://api.kilo.ai/api/gateway` and requiring the `KILOCODE_API_KEY` environment variable.
- **OpenMemory Integration**: 
  - Rules are mapped in the IDE rules directory at [/home/timothy/.antigravity-ide/extensions/mem0.openmemory-0.0.58-universal/rules/openmemory-kilocode.md](file:///home/timothy/.antigravity-ide/extensions/mem0.openmemory-0.0.58-universal/rules/openmemory-kilocode.md), setting guidelines for memory-first development, search phases, and memory collection checkpoints.
