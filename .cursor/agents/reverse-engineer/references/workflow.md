# Reverse Engineering Workflow

## Steps

1. **Ingest Target Repo**:
   - Clone or inspect remote GitHub repository into temporary workspace or `.agents/knowledge/external/`.
   - Audit directory layout, `package.json`, build configs, and entry points.

2. **Deconstruct Architecture**:
   - Trace data flow from route entry to backend service boundary.
   - Extract Zod/OpenAPI schemas, database models (SQL/Prisma/Kysely), and state management stores.

3. **Port & Extract Components**:
   - Copy relevant components or algorithms into `@repo/ui`, `@repo/utils`, or `apps/portal/src/features/`.
   - Remove unused external dependencies and align with `@repo/theme` light-mode design system.

4. **Document Learnings**:
   - Write durable learning document in `.agents/knowledge/architecture/` or `.agents/knowledge/patterns/`.
   - Update `.agents/knowledge/index.md` with new reference entry.
