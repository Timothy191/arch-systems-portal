Monolithic Next.js 16 app using the App Router. Layering inside the package:

- `app/` — Route Handlers under `app/api/` expose REST endpoints (`auth/[...nextauth]`, `projects`, `webhooks/github`, `user/complete-onboarding`). Pages under `app/` render server components by default; client-only pages are marked with `'use client'`.
- `services/` — thin service modules (`project.service.ts`, `integrations/github.service.ts`, `chat.service.ts`, `docgen.service.ts`) wrap `ApiClient` calls to the external backend at `NEXT_PUBLIC_API_URL` (defaults to `/api/`).
- `lib/` — shared runtime: `ApiClient` (Axios singleton), Prisma client (`prisma.ts`), GitHub token helpers, and utility functions.
- `components/` — feature-scoped React components grouped by domain (`chat/`, `dashboard/`, `integrations/github/`, `projects/`, `ui/` shadcn primitives).
- `constants/` and `types/` mirror the feature layout for endpoint URLs and request/response shapes.
- Auth is handled by next-auth v4 with Prisma adapter and JWT strategy; `middleware.ts` enforces an onboarding flow based on the `isNew` flag in the session token.
- Data persistence for auth + GitHub installation state lives in PostgreSQL via Prisma (`prisma/schema.prisma`); the app also depends on Neo4j (`neo4j-driver`) and Three.js (`react-force-graph-3d`) for graph visualization, indicating cross-process communication with a separate graph/docgen worker.
  Dependency direction: pages → services → ApiClient → backend; services never import pages; Prisma is only used by auth callbacks and internal helpers, not by route handlers (which delegate to the backend).
