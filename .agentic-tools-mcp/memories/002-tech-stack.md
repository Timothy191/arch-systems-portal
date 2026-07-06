# Tech Stack

**Date**: 2026-07-06
**Context**: Codebase analysis & package.json review

## Core Infrastructure

- **Package Manager**: pnpm (9.15.9)
- **Runtime**: Node.js (>=22, Volta pinned to 24.15.0)
- **Monorepo Tools**: Nx, Turborepo
- **Containerization**: Docker Compose (multiple profiles: portal, monitoring, tools, security, production)

## Languages

The codebase is highly polyglot:

1. **TypeScript / JavaScript** (dominant in apps & packages)
2. **Python** (used heavily in AI/data tooling, scripts)
3. **Go** (used for high-performance scanners like `sense`)
4. **SQL** (database schemas/migrations)
5. **Bash** (deployment and orchestration scripts)
6. Additional: Ruby, Java, Rust (in specialized tools/plugins)

## Key Libraries & Tools

- **Testing**: Playwright (E2E)
- **Linting & Code Quality**: ESLint, Prettier, Husky, lint-staged, Commitlint, knip, syncpack, secretlint, markdownlint
- **Database**: Supabase
- **MCP Ecosystem**: `@modelcontextprotocol/sdk` utilized extensively for sub-agents and external tooling integrations.
