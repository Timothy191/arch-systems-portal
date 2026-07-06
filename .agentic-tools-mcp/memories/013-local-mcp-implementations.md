# Local MCP Server Implementations

**Date**: 2026-07-06
**Context**: MCP servers implemented within this repository (not external packages)

## In-Repo MCP Servers (6 implementations)

### 1. preflight-mcp (`tools/preflight-mcp/`)

- **Entry**: `tools/preflight-mcp/index.js`
- **Runtime**: Node.js
- **SDK**: `@modelcontextprotocol/sdk`
- **Tools**: `preflight_echo`, `preflight_version`
- **Purpose**: Diagnostic and preflight check utility

### 2. n8n-mcp (`tools/n8n-mcp/`)

- **Entry**: `tools/n8n-mcp/index.js`
- **Runtime**: Node.js
- **Purpose**: Bridge to n8n workflow automation platform
- **Env**: `N8N_URL` (http://localhost:5678), `N8N_EMAIL`, `N8N_PASSWORD`
- **Has AGENT_TRACER.md**: Yes (initialized by Antigravity 2026-06-05)

### 3. repowise (`tools/repowise/`)

- **Entry**: `uv run --project tools/repowise repowise mcp . --transport stdio`
- **Runtime**: Python (uv project)
- **Structure**: Full package with CLI, core, server, web, api-client modules
- **Purpose**: Codebase intelligence — docs, graph, git signals, dead code, architectural decisions
- **Data**: `.agentic-tools-mcp/repowise/` (knowledge graph, wiki.db, caches — symlinked at `.repowise`), `.agentic-tools-mcp/repowise-workspace/` (cross-repo edges, contracts — symlinked at `.repowise-workspace`)
- **Also has**: Its own `.repowise/mcp.json` and `.vscode/mcp.json`

### 4. sense (`tools/sense/`)

- **Entry**: `tools/sense/bin/sense mcp`
- **Runtime**: Go (compiled binary)
- **Purpose**: High-performance semantic codebase navigation
- **Data**: `.sense/index.db` (23.9MB, 3966 files, 32378 symbols, 54334 edges)
- **Languages indexed**: Python, Go, TypeScript, TSX, JS, Ruby, Rust, C#, Java, etc.
- **Special**: `alwaysLoad: true` in `.mcp.json` with extensive serverInstructions
- **Has bench data**: `tools/sense/bench/` with verticals, scenarios, rubrics, results

### 5. memex (`tools/memex/`)

- **Entry**: `uv run --project tools/memex memex serve`
- **Runtime**: Python (uv project)
- **Purpose**: Temporal developer memory via Neo4j
- **Dependencies**: Neo4j at `bolt://localhost:7687`, Gemini API
- **Structure**: Graph-based memory with writer module

### 6. secrin (`tools/secrin/`)

- **Runtime**: Python package
- **Structure**: Has `apps/web` (Next.js dashboard)
- **Purpose**: Software wiki generator / security analysis
- **Note**: Not directly exposed as MCP in `.mcp.json` but is part of the tooling ecosystem

## External MCP Servers (run via npx/uvx/docker)

| Server                 | Package                                            | Source                              |
| ---------------------- | -------------------------------------------------- | ----------------------------------- |
| `codebase-memory-mcp`  | `codebase-memory-mcp` (global binary)              | `~/.local/bin/codebase-memory-mcp`  |
| `deepgraph-nextjs`     | `mcp-code-graph@latest`                            | npx, targets `vercel/next.js`       |
| `deepgraph-react`      | `mcp-code-graph@latest`                            | npx, targets `facebook/react`       |
| `deepgraph-typescript` | `mcp-code-graph@latest`                            | npx, targets `microsoft/TypeScript` |
| `github-official`      | `ghcr.io/github/github-mcp-server`                 | Docker container                    |
| `redis`                | `redis-mcp-server@latest`                          | uvx                                 |
| `agentic-tools`        | `@pimzino/agentic-tools-mcp`                       | npx                                 |
| `sequential-thinking`  | `@modelcontextprotocol/server-sequential-thinking` | npx                                 |
| `trace-mcp`            | N/A (standalone binary)                            | `~/.trace-mcp/bin/trace-mcp`        |
