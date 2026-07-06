# MCP Servers — Complete Inventory

**Date**: 2026-07-06 (updated)
**Context**: Full scan of all MCP server definitions across every config file

## Canonical Server List (13 servers)

Source of truth: `.mcp.json` (repo root). All editor configs mirror this set.

| #   | Server                 | Command                                                                               | Type          | Notes                                                                                                    |
| --- | ---------------------- | ------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | `preflight-mcp`        | `node tools/preflight-mcp/index.js`                                                   | Local         | Diagnostic/preflight utility                                                                             |
| 2   | `n8n-mcp`              | `node tools/n8n-mcp/index.js`                                                         | Local         | n8n workflow orchestration bridge. Env: `N8N_URL`, `N8N_EMAIL`, `N8N_PASSWORD`                           |
| 3   | `codebase-memory-mcp`  | `codebase-memory-mcp`                                                                 | Global binary | Knowledge graph for codebase navigation. Also in `~/.claude/.mcp.json`                                   |
| 4   | `repowise-mcp`         | `uv run --project tools/repowise repowise mcp . --transport stdio`                    | Local         | Codebase intelligence: docs, graph, git signals, dead code, decisions                                    |
| 5   | `sense-mcp`            | `tools/sense/bin/sense mcp`                                                           | Local         | Go-based semantic codebase navigation. `alwaysLoad: true`. Extensive serverInstructions for tool routing |
| 6   | `memex-mcp`            | `uv run --project tools/memex memex serve`                                            | Local         | Temporal developer memory via Neo4j. Env: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `GEMINI_API_KEY`  |
| 7   | `deepgraph-nextjs`     | `npx -y mcp-code-graph@latest vercel/next.js`                                         | Remote (npx)  | Next.js code graph from upstream repo                                                                    |
| 8   | `deepgraph-react`      | `npx -y mcp-code-graph@latest facebook/react`                                         | Remote (npx)  | React code graph from upstream repo                                                                      |
| 9   | `deepgraph-typescript` | `npx -y mcp-code-graph@latest microsoft/TypeScript`                                   | Remote (npx)  | TypeScript code graph from upstream repo                                                                 |
| 10  | `github-official`      | `docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server` | Docker        | GitHub API. Env: `GITHUB_PERSONAL_ACCESS_TOKEN`                                                          |
| 11  | `redis`                | `uvx --from redis-mcp-server@latest redis-mcp-server`                                 | Remote (uvx)  | Redis datastore operations. Env: `REDIS_URL`                                                             |
| 12  | `trace-mcp`            | `/home/timothy/.trace-mcp/bin/trace-mcp serve`                                        | Local binary  | Agent tracing/debugging. Data at `~/.trace-mcp/`                                                         |
| 13  | `agentic-tools-mcp`    | `node packages/agentic-tools-mcp/src/server.js`                                       | Local         | Project memory/task store. Exposes `agentic_*` memory and task tools                                     |

## Config File Matrix — Which Servers Are in Which File

| Config File                                                           | Servers                                                 | Notes                        |
| --------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------- |
| `.mcp.json` (root)                                                    | All 13                                                  | Canonical source of truth    |
| `.vscode/mcp.json`                                                    | 2 (`repowise`, `trace-mcp`)                             | VS Code native MCP (minimal) |
| `.vscode/cline_mcp_settings.json`                                     | All 13                                                  | Cline extension              |
| `.vscode/roo_mcp_settings.json`                                       | All 13 (key `codebase-memory` vs `codebase-memory-mcp`) | Roo Code extension           |
| `.agentic-tools-mcp/repowise/mcp.json` (`.repowise/mcp.json` symlink) | 1 (`repowise`)                                          | Repowise's own config        |
| `tools/repowise/.repowise/mcp.json`                                   | 1 (`repowise` scoped to `tools/repowise`)               | Sub-repo                     |
| `tools/repowise/.vscode/mcp.json`                                     | 1 (`repowise` scoped to `tools/repowise`)               | Sub-repo VS Code             |
| `~/.claude/.mcp.json`                                                 | 1 (`codebase-memory-mcp`)                               | Global Claude Code           |
| `~/.claude/settings.json`                                             | 1 (`repowise` via direct venv path)                     | Global Claude Code MCP       |
| `tools/sense/bench/global/docker/gitnexus/mcp.json`                   | 1 (`gitnexus`)                                          | Benchmark only               |
| `tools/sense/bench/global/docker/probe/mcp.json`                      | 1 (`probe`)                                             | Benchmark only               |

## Special Configurations

### sense-mcp — alwaysLoad + serverInstructions

The only server with `alwaysLoad: true` and extensive `serverInstructions`. Instructs agents to prefer Sense tools over grep/glob for structural queries. Defines when-to-use and when-not-to-use workflows.

### github-official — Docker-based

Runs in a Docker container. Requires `GITHUB_PERSONAL_ACCESS_TOKEN` env var passed via `-e` flag.

### memex-mcp — Neo4j dependency

Requires Neo4j running at `bolt://localhost:7687` (default) with credentials from `NEO4J_USER`/`NEO4J_PASSWORD`. Also needs `GEMINI_API_KEY` for semantic features.

### agentic-tools-mcp — Project memory/tasks

Local MCP server in `packages/agentic-tools-mcp`. Reads/writes `.agentic-tools-mcp/memories/*.md` and `.agentic-tools-mcp/tasks/tasks.json`. Companion daemon available via `pnpm agentic-tools:daemon`.

## Security Status

Credentials are no longer stored in plain text in committed MCP configs. `.mcp.json` and `.vscode/*_mcp_settings.json` now reference environment variables. Copy `.env.example` → `.env` at the repo root and fill in real values:

- `N8N_EMAIL`, `N8N_PASSWORD`
- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `GEMINI_API_KEY`
- `NEO4J_USER`, `NEO4J_PASSWORD`

Never commit `.env`.

## Usage Priority

1. **Prefer `sense-mcp`** for structural/semantic queries (symbol relationships, blast radius, conventions)
2. **Prefer `repowise-mcp`** for documentation, architectural decisions, dead code, health
3. **Use `codebase-memory-mcp`** for knowledge graph traversal
4. **Use `agentic-tools-mcp`** for project memories and task state
5. **Use `deepgraph-*`** for framework-specific code graph queries (Next.js, React, TypeScript)
6. **Use `trace-mcp`** for debugging agent behavior and tracing decisions

---

## Kilo Code Integration & Configuration

Kilo Code (`kilocode`) is an active model provider and agentic IDE extension installed in this environment. It manages its own set of local and remote MCP servers and skills.

### 1. Kilo Code MCP Servers

These servers are configured in the Kilo Code configuration files (`~/.config/kilo/kilo.json` and `.kilo/kilo.json`):

| Server | Command / URL | Type | Scope | Notes |
| --- | --- | --- | --- | --- |
| `airbyte-knowledge-mcp` | `https://airbyte.mcp.kapa.ai` | Remote | Global | Remote Airbyte knowledge access |
| `context7` | `npx -y @upstash/context7-mcp` | Local | Global | Upstash context retrieval MCP |
| `playwright` | `npx -y @playwright/mcp@0.0.38` | Local | Global | Playwright browser automation MCP |
| `time` | `uvx mcp-server-time` | Local | Global | System time MCP |
| `sequentialthinking` | `npx -y @modelcontextprotocol/server-sequential-thinking` | Local | Project | Project-level sequential reasoning |

### 2. Kilo Code Skills & Agents

- **Global Skills** are stored under `~/.kilo/skills/` and include:
  - `integrate-anything` (Universal integration patterns)
  - `apollo-graphql` (GraphQL queries/mutations)
  - `creating-data-lake-table` (AWS Athena/Glue data lake schema setup)
  - `agent-md-refactor` (Refactoring helper instructions)
  - `adbc` (Arrow Database Connectivity connection profiling)
  - `dashboarding` (Metrics and visualizations)
- **Custom Project Agents** are stored under `.kilo/agents/` and include:
  - `code-reviewer.md`: Primary mode setting for a senior software engineer conducting code quality and security reviews.
- **Local SQLite State**: Kilo stores its operational database at `~/.local/share/kilo/kilo.db`.

