# Architecture Overview

**Date**: 2026-07-06
**Context**: Initial codebase scan

## Core Metrics

- **Nodes**: 112,838
- **Edges**: 341,307
- **Primary Languages**: Python, TypeScript, Go, YAML, SQL

## Layer Architecture

1. **Entry Layers**: `memex`, `portal`
2. **Core Layers**: `secrin` (high fan-in), `sense` (high fan-in)
3. **Internal Layers**: `api`, `cms`, `overview`, `qoder`, `repowise`

## Sub-systems / Packages

- **apps**: `api`, `cms`, `overview`, `portal`
- **tools**: `memex`, `repowise`, `secrin`, `sense`, `n8n-mcp`, `policy`, `preflight-mcp`, `wiki-viewer`

## Boundaries and High-traffic Connections

- `repowise` calls `sense` heavily (1567 calls)
- `repowise` calls `secrin` heavily (613 calls)
- `sense` calls `repowise` (275 calls)
- `memex` calls `repowise` (226 calls)

This memory serves as a baseline understanding of the Arch-Mk2 system graph.
