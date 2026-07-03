# Workspace Integration & Agent Onboarding Guide

This directory contains workspace-level configurations to align the development environment for both human developers and AI agents.

## VS Code & LSP Configuration

- **`settings.json`**: Configures editor integration for TypeScript, ESLint, and Prettier. It guarantees that workspace TypeScript SDK is used and enforces auto-formatting and lint fixing on save.
- **`extensions.json`**: Recommends key extensions (ESLint, Prettier, Cline, Roo Code) for onboarding developers or agents.

---

## Codebase Intelligence & MCP Servers

We have preconfigured the following Model Context Protocol (MCP) servers in `cline_mcp_settings.json` and `roo_mcp_settings.json`:

### 1. `preflight-mcp` (Diagnostic Utility)

- **Command**: `node tools/preflight-mcp/index.js`
- **Purpose**: A lightweight utility server used for workspace diagnostic checks.

### 2. `n8n-mcp` (Workflows Bridge)

- **Command**: `node tools/n8n-mcp/index.js`
- **Environment Variables**:
  - `N8N_URL` (default: `http://localhost:5678`)
  - `N8N_EMAIL` (your registered n8n account email)
  - `N8N_PASSWORD` (your n8n account password)

### 3. `codebase-memory` (Knowledge Graph)

- **Command**: `codebase-memory-mcp`
- **Purpose**: A custom codebase knowledge graph server used for graph queries, code intelligence, and dependency analysis.

### 4. `repowise-mcp` (Codebase Intelligence & Health)

- **Command**: `uv run --project tools/repowise repowise mcp .`
- **Purpose**: Provides deep structural dependency graphs, git history analytics (hotspots, ownership), and deterministic code health scores.
- **Initialization**: Run `uv run --project tools/repowise repowise init` to initialize or update the repository's index.

### 5. `sense-mcp` (Go-based Codebase Navigation)

- **Command**: `tools/sense/bin/sense`
- **Purpose**: Compiled Go codebase understanding tool providing symbol graphs, semantic search, and blast radius analysis.

### 6. `memex-mcp` (Developer Context Memory)

- **Command**: `uv run --project tools/memex memex serve`
- **Purpose**: Builds and maintains a temporal knowledge graph of your codebase, tracking modules, symbols, decisions, and open problems.
- **Environment Variables**:
  - `NEO4J_URI` (default: `bolt://localhost:7687`)
  - `NEO4J_USER` (default: `neo4j`)
  - `NEO4J_PASSWORD` (default: `memex-local`)
  - `GEMINI_API_KEY` (Gemini API key for analytical processing)

---

## Local Tooling & Database Setup (Neo4j)

Both `memex` and `secrin` utilize a Neo4j graph database to store codebase representations. To avoid port conflicts, we run them in separate Docker containers:

### Start Database for Memex (Port 7687)

```bash
docker run -d --name neo4j-memex -p 7687:7687 -p 7474:7474 -e NEO4J_AUTH=neo4j/memex-local neo4j:5.20.0
```

### Start Database for Secrin (Port 7688)

```bash
docker run -d --name neo4j-secrin -p 7688:7687 -p 7475:7474 -e NEO4J_AUTH=neo4j/secrin-local neo4j:5.20.0
```

---

## Additional Context Tools

### Secrin (Wiki Software Encyclopedia)

Located in `tools/secrin`, **Secrin** parses the codebase into a Neo4j graph to generate a living software wiki and dashboard.

- **Setup & Install**: Run `uv sync --all-packages` inside `tools/secrin`.
- **Verify Connections**: `uv run --project tools/secrin python scripts/verify.py`
- **Build Graph**: `uv run --project tools/secrin secrin graph build --repo .`
- **Analyze Codebase**: `uv run --project tools/secrin secrin analyze`
- **Start Web Dashboard**:
  - Go to `tools/secrin/apps/web/`
  - Run `pnpm install` and `pnpm dev` to launch the Next.js visualizer on `http://localhost:3000`.

---

## Onboarding Custom AI Agents

### 1. Cline & Roo Code

No manual action is required. Cline and Roo Code automatically detect and load MCP servers configured in `.vscode/cline_mcp_settings.json` and `.vscode/roo_mcp_settings.json` when the workspace is opened.

### 2. Claude Code

Add these servers to Claude Code's global configuration by running the following commands from the repository root:

```bash
# Add Preflight MCP
claude mcp add preflight-mcp node tools/preflight-mcp/index.js

# Add Repowise MCP
claude mcp add repowise-mcp uv --project tools/repowise repowise mcp .

# Add Sense MCP
claude mcp add sense-mcp tools/sense/bin/sense

# Add Memex MCP (replace placeholders with actual values)
claude mcp add memex-mcp uv --project tools/memex memex serve --env NEO4J_URI="bolt://localhost:7687" --env NEO4J_USER="neo4j" --env NEO4J_PASSWORD="memex-local" --env GEMINI_API_KEY="your-gemini-key"
```

### 3. Gemini / Antigravity IDE

Register the servers in your global user configuration located at `~/.gemini/antigravity-ide/mcp_config.json`:

```json
{
  "mcpServers": {
    "preflight-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/Arch-Mk2/tools/preflight-mcp/index.js"]
    },
    "repowise-mcp": {
      "command": "/absolute/path/to/uv",
      "args": [
        "run",
        "--project",
        "/absolute/path/to/Arch-Mk2/tools/repowise",
        "repowise",
        "mcp",
        "/absolute/path/to/Arch-Mk2"
      ]
    },
    "sense-mcp": {
      "command": "/absolute/path/to/Arch-Mk2/tools/sense/bin/sense",
      "args": []
    },
    "memex-mcp": {
      "command": "/absolute/path/to/uv",
      "args": [
        "run",
        "--project",
        "/absolute/path/to/Arch-Mk2/tools/memex",
        "memex",
        "serve"
      ],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "memex-local",
        "GEMINI_API_KEY": "your-gemini-key"
      }
    }
  }
}
```
