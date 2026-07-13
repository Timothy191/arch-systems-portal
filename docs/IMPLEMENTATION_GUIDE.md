# Implementation Guide

## Overview

This guide provides comprehensive instructions for implementing the best practices, skills, workflows, hooks, and subagents for the Arch-Mk2 industrial mining portal.

## Architecture Summary

### Current Stack

- **Frontend**: Next.js 16 (App Router) + React 19
- **Backend**: Supabase (PostgreSQL + Auth)
- **Monorepo**: pnpm + Turborepo
- **Styling**: Tailwind CSS + Glassmorphism
- **State**: Zustand (Client) + XState (Complex)
- **Testing**: Jest + Playwright
- **CI/CD**: GitHub Actions
- **Deployment**: Docker + Vercel

### Architecture Principles

1. **Data Access Boundary**: Apps import `@repo/supabase`, never `@repo/database`
2. **Two-tier Caching**: L1 Memory + L2 Redis with single-flight dedup
3. **Server Actions Pattern**: `"use server"` + Supabase + Auth + Zod + Cache
4. **Employee Header Optimization**: `x-auth-employee-id` header avoids DB round-trips
5. **Custom Proxy**: `proxy.ts` handles auth, rate limiting, department access

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

#### Skills Implementation

1. **Next.js Code Review** (`next-code-review`)
   - Automated code review for App Router patterns
   - Server Components validation
   - Performance checks

2. **React Performance** (`react-performance`)
   - Component profiling
   - Bundle analysis
   - Re-render optimization

3. **Supabase RLS** (`supabase-rls`)
   - Row Level Security validation
   - Policy audit
   - Data access patterns

#### Workflows Implementation

1. **Next Dev Loop** (`next-dev-loop`)
   - Hot reload with Turbopack
   - Type checking
   - Linting

2. **Monorepo Build** (`monorepo-build`)
   - Turborepo pipeline
   - Dependency management
   - Parallel execution

#### Hooks Implementation

1. **Pre-commit Hook**
   - TypeScript type checking
   - ESLint validation
   - Prettier formatting
   - Large file detection

2. **Post-commit Hook**
   - Repowise index update
   - Checksum manifest update
   - Skills lock file update

### Phase 2: Testing (Week 3-4)

#### Skills Implementation

1. **Playwright E2E** (`playwright-e2e`)
   - E2E test generation
   - Visual regression testing
   - Cross-browser testing

2. **Docker Optimizer** (`docker-optimizer`)
   - Multi-stage builds
   - Image optimization
   - Security scanning

#### Workflows Implementation

1. **Security Scan** (`security-scan`)
   - OWASP Top 10 validation
   - Dependency auditing
   - Container scanning

2. **Deploy Staging** (`deploy-staging`)
   - Health checks
   - Validation
   - Rollback procedures

#### Hooks Implementation

1. **Pre-push Hook**
   - Full test suite
   - Type checking
   - Linting
   - Security audit

### Phase 3: Security (Week 5-6)

#### Skills Implementation

1. **GitHub Actions** (`github-actions`)
   - CI/CD optimization
   - Caching strategies
   - Security best practices

2. **Monitoring Setup** (`monitoring-setup`)
   - Prometheus metrics
   - Grafana dashboards
   - Alerting rules

#### Workflows Implementation

1. **Security Scan** (`security-scan`)
   - OWASP Top 10 checklist
   - Vulnerability scanning
   - Compliance reporting

2. **Deploy Production** (`deploy-production`)
   - Blue-green deployment
   - Canary releases
   - Rollback procedures

#### Agents Implementation

1. **Code Reviewer** (`code-reviewer`)
   - Automated code review
   - Best practices validation
   - Security checks

2. **Security Auditor** (`security-auditor`)
   - OWASP Top 10 validation
   - Vulnerability scanning
   - Compliance reporting

### Phase 4: DevOps (Week 7-8)

#### Skills Implementation

1. **GitHub Actions** (`github-actions`)
   - Workflow optimization
   - Caching strategies
   - Security best practices

2. **Monitoring Setup** (`monitoring-setup`)
   - Prometheus metrics
   - Grafana dashboards
   - Alerting rules

#### Workflows Implementation

1. **Deploy Staging** (`deploy-staging`)
   - Health checks
   - Validation
   - Rollback procedures

2. **Deploy Production** (`deploy-production`)
   - Blue-green deployment
   - Canary releases
   - Rollback procedures

#### Agents Implementation

1. **Performance Profiler** (`performance-profiler`)
   - React profiling
   - Bundle analysis
   - Core Web Vitals

2. **Dependency Analyzer** (`dependency-analyzer`)
   - Security auditing
   - Version management
   - Bundle optimization

## Best Practices Implementation

### Next.js 16 Best Practices

#### Server Components

```typescript
// Server Component (default)
async function DataComponent() {
  const data = await fetchData() // Runs on server
  return <div>{data.map(item => <Item key={item.id} {...item} />)}</div>
}

// Client Component (only when needed)
'use client'
function InteractiveComponent() {
  const [state, setState] = useState()
  return <button onClick={() => setState(!state)}>Toggle</button>
}
```

#### Caching Strategy

```typescript
// Two-tier caching
const cachedData = await cacheWrap(
  `key:${id}`,
  async () => {
    const data = await fetchData(id);
    return data;
  },
  { ttl: 300 }, // 5 minutes
);
```

#### Server Actions

```typescript
"use server";
async function updateData(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AuthError("Unauthorized");

  const validated = schema.safeParse(Object.fromEntries(formData));
  if (!validated.success) throw new ValidationError(validated.error);

  await supabase.from("table").update(validated.data).eq("id", id);
  revalidateRSC(["table:data"]);

  return { success: true };
}
```

### Monorepo Best Practices

#### Package Structure

```
packages/
├── auth/           # @repo/auth
├── database/       # @repo/database (migrations only)
├── errors/         # @repo/errors
├── redis/          # @repo/redis
├── supabase/       # @repo/supabase (data access boundary)
├── theme/          # @repo/theme
├── ui/             # @repo/ui
└── utils/          # @repo/utils
```

#### Dependency Management

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  react: ^19.2.6
  next: ^16.2.10
  tailwindcss: ^3.4.17
```

### Testing Best Practices

#### Unit Testing

```typescript
// Jest test
describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

#### E2E Testing

```typescript
// Playwright test
test("user can login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "user@example.com");
  await page.fill('input[name="password"]', "password");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

### Security Best Practices

#### Input Validation

```typescript
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const validated = schema.safeParse(input);
if (!validated.success) {
  throw new ValidationError(validated.error);
}
```

#### RLS Policies

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);
```

## Monitoring and Observability

### Prometheus Metrics

```typescript
// lib/metrics.ts
import { Registry, Counter, Histogram } from "prom-client";

export const register = new Registry();

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});
```

### Grafana Dashboard

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(http_requests_total[5m])",
          "legendFormat": "{{method}} {{route}}"
        }
      ]
    }
  ]
}
```

## Deployment Strategies

### Blue-Green Deployment

1. Deploy new version to green environment
2. Run health checks
3. Switch traffic from blue to green
4. Keep blue for rollback

### Canary Release

1. Deploy new version to small subset of users
2. Monitor metrics
3. Gradually increase traffic
4. Full deployment if successful

## Success Metrics

### Performance

- **Lighthouse Score**: > 90
- **Core Web Vitals**: All passing
- **Bundle Size**: < 200KB first load
- **Response Time**: < 200ms P95

### Security

- **OWASP Top 10**: All checks passing
- **Vulnerabilities**: 0 critical
- **Dependencies**: All up to date

### Code Quality

- **Test Coverage**: > 80%
- **TypeScript**: Zero errors
- **ESLint**: Zero warnings

### Deployment

- **CI/CD Pipeline**: < 5 minutes
- **Deployment Success Rate**: > 99%
- **Rollback Time**: < 5 minutes

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Documentation](https://pnpm.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
