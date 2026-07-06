This repository is a multi-language monorepo that manages dependencies across Node.js/TypeScript, Go, and Python using language-native package managers coordinated by a top-level orchestrator. There is no single unified dependency system — instead each language ecosystem follows its own conventions while being wired together through the root workspace.

### Node.js / TypeScript (pnpm workspaces)

- **Package manager**: pnpm 9.15.9, pinned via `packageManager` field in root `package.json` and enforced through Volta (`node: 24.15.0`, `pnpm: 9.15.9`).
- **Workspace layout**: `pnpm-workspace.yaml` declares `apps/*` and `packages/*` as workspace members. Internal packages reference each other via `workspace:*` protocol (e.g., `@repo/ui`, `@repo/supabase`, `@repo/theme`, `@repo/utils`, `@repo/redis`).
- **Catalog strategy**: A root-level `catalog:` section centralizes versions for shared libraries (lucide-react, tailwindcss, eslint, prettier, typescript, react, zod, zustand, framer-motion, etc.), and a separate `catalogs.react19:` catalog pins React 19 across all consumers. This eliminates version drift between apps and packages.
- **Security overrides**: Root `overrides:` forces patched versions of vulnerable transitive deps (handlebars, brace-expansion, minimatch, braces, glob, serialize-javascript, kysely, tmp, uuid, smol-toml, esbuild, @babel/runtime, js-yaml).
- **Lockfile**: `pnpm-lock.yaml` at the repo root; no per-project lockfiles are committed.
- **No private registry config**: No `.npmrc` file exists, so packages resolve from public npm registries only.
- **Dev tooling**: `syncpack` scripts (`deps:check`, `deps:fix`, `deps:lint`) enforce catalog consistency; `knip` detects unused dependencies; `nx` caches build/lint/test artifacts keyed on dependency inputs.

### Go (tools/sense)

- **Module**: `github.com/luuuc/sense`, declared in `tools/sense/go.mod` with Go 1.25.5.
- **Lockfile**: `go.sum` is committed alongside `go.mod`, pinning every direct and indirect dependency to exact hashes.
- **Dependencies**: Heavy use of tree-sitter grammars for multiple languages, MCP server SDK, and modernc.org/sqlite. All versions are explicit (no `latest` or open ranges).
- **No vendoring**: Dependencies are resolved from the Go module proxy; no `vendor/` directory.

### Python (tools/memex, tools/repowise, tools/secrin)

- **memex** (`tools/memex/pyproject.toml`): Uses Hatchling as build backend, declares runtime dependencies with upper-bound constraints (e.g., `graphiti-core>=0.29.0,<1.0.0`), optional extras (`cluster`, `otel`, `all`), and a `[dependency-groups]` dev section. Managed by uv (`[tool.uv] managed = true`) with `uv.lock` committed.
- **repowise** (`tools/repowise/pyproject.toml`): Setuptools-based distribution exposing CLI + server + core under one PyPI package name, with extensive tree-sitter grammar dependencies, LLM provider SDKs, and optional extras (`postgres`, `graph-extra`, `dev`). Also uses uv workspace for local development.
- **secrin** (`tools/secrin/pyproject.toml` + `poetry.lock`): Poetry-managed project with `poetry.lock` committed.
- **No shared Python workspace**: Each Python tool is an independent package with its own lockfile; there is no cross-tool Python dependency sharing.

### Cross-cutting conventions

- **Version pinning discipline**: Every ecosystem pins major/minor versions tightly (Node catalogs, Go exact hashes, Python `<next-major>` bounds).
- **No vendoring strategy**: None of the ecosystems vendor third-party code into the repo; all rely on their native registry/proxy.
- **Nx integration**: `nx.json` treats `pnpm-workspace.yaml` and `.npmrc` as named inputs for caching, and task graphs depend on `^build` of sibling packages, enforcing internal dependency ordering.
- **Engine enforcement**: Root `engines.node >= 22` plus Volta ensures consistent runtime across contributors and CI.

### Rules developers should follow

1. Add new Node deps to the root catalog in `pnpm-workspace.yaml` rather than pinning ad-hoc in individual `package.json` files, then reference via `workspace:*` for internal packages.
2. Keep React 19 aligned through the `react19` catalog — do not override it in app/package manifests.
3. Commit lockfiles: `pnpm-lock.yaml`, `go.sum`, and each Python tool's lockfile must stay in sync with manifest changes.
4. Do not introduce private registries without adding `.npmrc` configuration and documenting auth setup.
5. Use `overrides:` sparingly at the root only for security patches; prefer updating the offending package's own version constraint.
6. Go modules: Pin exact versions in `go.mod`; never remove entries from `go.sum`.
7. Python tools: Keep upper-bound constraints (`<next-major`) to prevent breaking upgrades; document optional extras clearly.
