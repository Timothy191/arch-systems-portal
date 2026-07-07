# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area                | Value            | Evidence                          |
| ------------------- | ---------------- | --------------------------------- |
| Primary language    | TypeScript       | apps/portal/package.json:27       |
| Runtime + version   | Node >=22        | package.json:38                   |
| Package manager     | pnpm 9.15.9      | package.json:59                   |
| Module/build system | pnpm + Turborepo | package.json:242, package.json:90 |

### 2) Production Frameworks and Dependencies

| Dependency     | Version          | Role in system                      | Evidence                    |
| -------------- | ---------------- | ----------------------------------- | --------------------------- |
| next           | 16.3.0-canary.78 | Next.js 16 App Router               | apps/portal/package.json:26 |
| react          | ^19.2.6          | React 19                            | apps/portal/package.json:27 |
| @repo/supabase | workspace:\*     | Data access layer (vector DB, auth) | apps/portal/package.json:14 |
| @repo/redis    | workspace:\*     | Redis client + caching helpers      | apps/portal/package.json:13 |
| @repo/theme    | workspace:\*     | Design tokens + Tailwind preset     | apps/portal/package.json:15 |
| @repo/ui       | workspace:\*     | shadcn-style primitives             | apps/portal/package.json:16 |
| framer-motion  | ^12.4.0          | Animation library                   | apps/portal/package.json:22 |
| zustand        | ^5.0.13          | State management                    | apps/portal/package.json:35 |
| xsjs           | ^2.2.2           | XState bindings                     | apps/portal/package.json:33 |

### 3) Development Toolchain

| Tool        | Purpose                    | Evidence                    |
| ----------- | -------------------------- | --------------------------- |
| eslint      | Linting engine             | apps/portal/package.json:51 |
| prettier    | Code formatter             | apps/portal/package.json:83 |
| jest        | Unit & integration testing | apps/portal/package.json:65 |
| playwright  | E2E testing                | apps/portal/package.json:53 |
| @swc/core   | Compiler                   | apps/portal/package.json:40 |
| @swc/jest   | Jest transformer           | apps/portal/package.json:41 |
| tailwindcss | CSS utility classes        | apps/portal/package.json:56 |

### 4) Key Commands

```bash
# Install dependencies
pnpm install

# Build portal
pnpm --filter portal run build

# Dev mode (Portal only, no Docker/Supabase)
pnpm --filter portal run dev --quick

# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format
```

### 5) Environment and Config

- Config sources: .env.example, .env
- Required env vars: NOT_DEEP_SCANNED_SECRET, N8N_PASSWORD, N8N_EMAIL
- Deployment/runtime constraints: Vercel production (Node.js runtime with 3GB memory limit)

### 6) Evidence

- package.json:27 (node version and react dependency)
- apps/portal/package.json (complete package manifest)
- .env.example (root directory)

```

```
