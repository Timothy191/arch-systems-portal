# System Logs Directory

This directory provides an aggregated central location for application and infrastructure logs across the Arch-Mk2 monorepo. It is specifically designed for the **Agentic AI** layer (like the Memex and Sense MCP servers, and ai-agents microservice) to parse, analyze, and root-cause issues seamlessly.

## Directory Structure

- `portal/`: Logs emitted by the Next.js 16 portal (SSR errors, RSC stream drops, routing proxies).
- `api/`: Logs emitted by the NestJS 11 Fastify API (including Zod validation errors, unhandled exceptions, and auth guard drops).
- `ai-agents/`: Internal logs for the Python FastAPI agent orchestration (CrewAI/LangGraph state traces).
- `mcp/`: Logs emitted by the Model Context Protocol servers (e.g. repowise, n8n-mcp, codebase-memory).
- `infra/`: Logs for PostgreSQL databases, Redis caching layers, Nginx reverse proxies, and Docker Compose networking events.

## Agent Guidelines

AI Agents scanning this directory for anomaly detection should:

1. Cross-reference `api/` timestamps with `infra/` database latency reports.
2. Check `mcp/` logs if autonomous agent tools suddenly fail in `ai-agents/`.
3. Not modify or delete these logs; they are append-only.
