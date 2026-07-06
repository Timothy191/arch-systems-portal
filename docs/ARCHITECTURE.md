---
title: Arch-Mk2 AI System Architecture
version: "2.0"
last_updated: "2026-07-06"
---

# Arch-Mk2 AI System Architecture

## Overview

Arch-Mk2 is a multi-agent AI development platform organized around MCP (Model Context Protocol) services and a distributed skill/agent registry.

## Core Components

```
┌─────────────────────────────────────────────────┐
│                   MCP Ecosystem                  │
│  ┌─────────────┐  ┌──────────────┐              │
│  │ Preflight   │  │ Agentic      │              │
│  │ MCP v2.0    │  │ Tools MCP    │              │
│  │ (Build/FFT) │  │ (Memory/Task)│              │
│  └──────┬──────┘  └──────┬───────┘              │
│  ┌──────┴──────┐  ┌──────┴───────┐              │
│  │ Repowise    │  │ n8n          │              │
│  │ MCP         │  │ MCP         │              │
│  └─────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────┘
```

## Agent System

- **System Orchestrator**: Manages lifecycle, coordinates builds, verifies integrity
- **Skill Registry**: `/.agentic-tools-mcp/agents/skills/` (1500+ skills)
- **Agent Definitions**: `/.github/agents/` and `/.agentic-tools-mcp/agents/`
- **Shared Memory**: `/.agentic-tools-mcp/memories/`

## Build Pipeline (MPC)

The preflight-mcp v2.0 server adds:

1. **Parallel execution** via Promise.all-based worker pool
2. **SHA-256 checksum verification** for artifact integrity
3. **Skill dependency graph generation** (Mermaid format)
4. **FFT analysis** of build timing data for concurrency optimization

## Quality Gate

```bash
pnpm quality          # Full quality gate (via turbo)
pnpm mcp:check        # MCP health check
node tools/preflight-mcp/index.js --tool mpc_full_quality_gate
```
