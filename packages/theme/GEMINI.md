# Design System (@repo/theme)

Single source of truth for visual design, tokens, and Tailwind configuration.

## 🚀 Key Commands

- `pnpm codegen`: Generate TypeScript tokens from `tokens.json` using Style Dictionary.
- `pnpm tokens:watch`: Rebuild tokens automatically on change.
- `pnpm lint:tokens`: Validate token naming and structure.
- `pnpm lint:css`: Lint global CSS files.

## 🛠️ Development Conventions

### Color System (OKLCH)

- **Palette**: Neutral-heavy with functional accents (≤10%).
- **Tokens**: Primitives are named `arch0` to `arch15`.
- **Semantic Aliases**: Always prefer semantic aliases (e.g., `bg-primary`, `text-heading`, `accent-blue`) over primitives.
- **Theme**: Light-only (macOS Sonoma visual language). Dark mode is explicitly NOT supported.

### Tailwind Configuration

- The preset lives in `src/tailwind/preset.ts`.
- Components in the monorepo import this preset to ensure consistent styling.

### Animation Rules

- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo).
- **Durations**: 150ms (micro), 250ms (structural), 400ms (modal).
- **Restrictions**: Never animate layout properties (`width`, `height`, etc.). Only `opacity`, `transform`, and colors.

### Login page — reference implementation

Canonical sign-in surface: `apps/portal/src/app/(auth)/login/page.tsx`.

| Element | Implementation |
|---|---|
| Shell | `.os-shell.os-shell--login` + `.os-shell-enter-2` (see `unified-os-shell` spec) |
| Card width | `max-w-[420px]`, `min-h-[720px]` |
| Title bar | macOS traffic lights (`bg-mac-red/yellow/green`) + centered “Arch — System Sign In” |
| Brand mark | Folded `@repo/ui/Logo` (`.login-brand-mark`, `.login-brand-fold`) |
| Heading | `font-display` “Arch-System” (`--font-display` / Anurati), 13px secondary labels |
| Form | `LoginForm`: remember me, forgot password, OAuth (Google / Microsoft / GitHub) |
| Footer | `LoginBrandBanner` marquee — partner + AI logos from `/branding/ai/` |
| Notice | VPN callout with info icon, `border-border-subtle`, `--overlay-dim` background |

Do **not** treat `apps/portal/app/(auth)/login/page.tsx` as canonical — it is a legacy duplicate (company JPEG branding, `liquid-glass-light`, enterprise footer).

### Agent Tracing & Context Hand-off (MANDATORY RULE)

- **Workflow Traces**: All agents MUST update the `AGENT_TRACER.md` file in the root of the package/app they are modifying. You must log a timestamp, your purpose, the changes made, and what the next agent should know.
- **Context Breadcrumbs**: When implementing complex architectural logic, agents MUST leave inline `// AGENT-TRACE: <explanation>` or `/* AGENT-TRACE: ... */` comments. This ensures future AI agents understand the implicit business rules or domain context immediately upon reading the file.
- **Runtime Telemetry**: Where applicable, ensure functions are instrumented (e.g., `prom-client` or OpenTelemetry spans) so runtime behavior can be analyzed by subsequent debugging agents.
