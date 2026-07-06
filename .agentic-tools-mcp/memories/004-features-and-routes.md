# Features & Routes

**Date**: 2026-07-06
**Context**: Codebase analysis & architecture scan

## Primary System Features

- **Codebase Intelligence & Insights**: The `repowise` and `sense` services provide deep analysis of the project. Features include identifying dead code, graphing architectures, and checking for breaking changes.
- **Security Auditing**: The `secrin` engine scans the codebase and infrastructure for security compliance and flaws.
- **Workflow Automation**: `n8n-mcp` handles multi-step AI tool execution flows and automated mesh networking between tools.
- **Memory Management**: The `memex` system establishes temporal, vector, and hybrid developer memory, leveraging Neo4j.
- **Content Management**: An admin dashboard/CMS app to manage operational content.

## Key Exposed Routes

Primarily served by the API layer, heavily focused on repository analytics and tooling intelligence:

### Analytics & Graphs

- `GET /{repo_id}/overview-summary`
- `GET /{repo_id}/nodes/search`
- `GET /graph`
- `GET /system-graph`
- `GET /architecture`

### Health & Diagnostics

- `GET /diagnostics`
- `GET /blast-radius`
- `GET /breaking-changes`
- `GET /conformance`
- `GET /co-changes`

### Administration & API Access

- `POST /sync`
- `PATCH /active`
- `GET /version`
- `GET /changelog`
- `POST /{provider_id}/key`
