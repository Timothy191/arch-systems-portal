# Codebase Map & LSP Requirements

This document acts as a permanent reference mapping the codebase structure to its respective Language Server Protocol (LSP) and Model Context Protocol (MCP) server requirements.

## 🗺️ Codebase & LSP Matrix

| Directory / Workspace   | Role / Framework                | Primary Language      | Required LSP / Indexer         | Active MCP Server  |
| :---------------------- | :------------------------------ | :-------------------- | :----------------------------- | :----------------- |
| **`apps/portal`**       | Next.js 16 Operations Dashboard | TypeScript / React 19 | TypeScript (`tsserver`)        | `deepgraph-nextjs` |
| **`apps/api`**          | NestJS 11 Backend (Fastify)     | TypeScript            | TypeScript (`tsserver`)        | N/A                |
| **`apps/cms`**          | Payload CMS v3                  | TypeScript            | TypeScript (`tsserver`)        | N/A                |
| **`apps/overview`**     | Architecture/Flow Viewer        | TypeScript            | TypeScript (`tsserver`)        | N/A                |
| **`packages/supabase`** | Data Access Layer (Kysely)      | TypeScript            | TypeScript (`tsserver`)        | N/A                |
| **`packages/database`** | SQL Migrations                  | SQL                   | SQL Language Server (Optional) | N/A                |
| **`packages/ui`**       | Shadcn / UI Primitives          | TypeScript            | TypeScript (`tsserver`)        | `deepgraph-react`  |
| **`packages/theme`**    | HSL/OKLCH Design Tokens         | TypeScript / CSS      | Style Dictionary / CSS         | N/A                |
| **`tools/repowise`**    | Codebase Intelligence Layer     | Python                | Python (`pyright` / `pylsp`)   | `repowise-mcp`     |
| **`tools/sense`**       | Symbol Graph / Semantic Search  | Go                    | Go (`gopls`)                   | `sense-mcp`        |
| **`tools/memex`**       | Temporal Knowledge Graph        | Python                | Python (`pyright`)             | `memex-mcp`        |

---

## ⚙️ LSP & MCP Configuration Setup

All active CLI agents (including Cline, Roo Code, and Claude Code) discover these workspace settings automatically through:

- **VS Code Settings**: Configured in [.vscode/settings.json](file:///home/timothy/Documents/Arch-Mk2/.vscode/settings.json) to lock the Repowise API server to port `7337` and enforce automatic headless startup.
- **Cline Settings**: Configured in [.vscode/cline_mcp_settings.json](file:///home/timothy/Documents/Arch-Mk2/.vscode/cline_mcp_settings.json).
- **Roo Code Settings**: Configured in [.vscode/roo_mcp_settings.json](file:///home/timothy/Documents/Arch-Mk2/.vscode/roo_mcp_settings.json).
- **Fallback LSP Ports**: Ports `9527` and `9528` are actively listening for LSP MCP client requests.
