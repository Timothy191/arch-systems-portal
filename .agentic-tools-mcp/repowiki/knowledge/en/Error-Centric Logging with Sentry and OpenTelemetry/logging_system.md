The repository does not implement a general-purpose structured logging framework. Instead, it follows an error-centric logging approach centered on the portal application's `error-logger` utility, which funnels errors through two sinks: local console output and Sentry for production monitoring. Non-error informational output is ad-hoc via bare `console.log`/`console.warn`/`console.error` scattered across scripts and tools.

**What system/approach is used**

- **Error-only logger**: A single shared utility (`apps/portal/lib/errors/error-logger.ts`) provides `logError`, `withErrorLogging`, and `withServerActionLogging`. It builds a typed `ErrorLogEntry` (timestamp, severity, code, statusCode, message, context, cause, stack, url, method, userId, sessionId) and writes to `console.error`/`console.warn` locally.
- **Sentry integration**: Errors of severity `error` or `fatal` are forwarded to Sentry via `@sentry/nextjs`; info/warn (4xx control-flow) are only printed to the console. Sentry is initialized in three places — `instrumentation.ts` (Node + Edge), `sentry.server.config.ts`, and `sentry.client.config.ts` — each scrubbing sensitive headers/values in `beforeSend`.
- **OpenTelemetry traces**: The Next.js `register()` hook dynamically bootstraps the Node SDK with auto-instrumentations and an OTLP HTTP exporter when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, tagging spans with `service.name = OTEL_SERVICE_NAME` (default `arch-portal`). This is tracing, not log shipping.
- **Metrics (not logs)**: `apps/portal/lib/observability/metrics.ts` records job and DB timing/error counts into an in-process Map plus Redis keys (`metrics:job:*`, `metrics:db:*`) and exposes them via `getObservabilityMetrics()`. This is metrics, not structured logs.
- **Ad-hoc console logging**: Development and tooling code uses raw `console.log`/`console.warn`/`console.error` (e.g. `apps/cms/scripts/setup.ts`, VS Code extension stdout/stderr capture). There is no central log-level configuration or formatter.

**Key files and packages**

- `apps/portal/lib/errors/error-logger.ts` — structured error entry shape, severity derivation, console+Sentry sink, wrapper helpers
- `apps/portal/instrumentation.ts` — OpenTelemetry NodeSDK bootstrap + server-side Sentry init + global `__recordDbQuery` export
- `apps/portal/sentry.server.config.ts` / `apps/portal/sentry.client.config.ts` — per-runtime Sentry initialization with header/value scrubbing
- `apps/portal/lib/observability/metrics.ts` — in-memory + Redis-backed job/DB metric counters (distinct from logging)
- `apps/portal/app/api/*/route.ts` and `apps/portal/app/actions.ts` — consumers calling `logError` / `withErrorLogging`

**Architecture and conventions**

- Errors are the primary loggable event; there is no equivalent `logInfo`/`logDebug` API. Callers wrap risky blocks with `withErrorLogging(req, handler)` or `withServerActionLogging(handler, name)` so that any thrown `Error` is automatically captured with request/action context.
- Severity is derived from HTTP status codes (`>=500 → error`, `>=400 → warn`, else `info`) or defaults to `error` for unclassified exceptions.
- Sensitive data is redacted at ingestion time: server-side Sentry strips `authorization`, `cookie`, `x-internal-secret` headers; client-side Sentry rewrites exception values containing `password` or `token`.
- Tracing and logging are orthogonal: OpenTelemetry emits spans via OTLP, while Sentry captures exceptions and events. No bridge between the two exists in this repo.
- Metrics live in a separate module and use Redis as the aggregation sink; they are not emitted as log lines.

**Rules developers should follow**

1. **Never call `console.log` in production route handlers** — use `logError` for failures and rely on OpenTelemetry spans for normal flow instrumentation.
2. **Wrap async handlers** with `withErrorLogging(req, handler)` (API routes) or `withServerActionLogging(handler, actionName)` (server actions) so context (url, method, userId, sessionId) is always attached.
3. **Attach contextual fields** (`userId`, `sessionId`, custom `code`/`statusCode` on thrown errors) rather than embedding secrets in messages; let `beforeSend` scrubbers handle redaction.
4. **Do not add new console-based sinks** — if you need a new destination, extend `sendToMonitoring` in `error-logger.ts`.
5. **Use `recordJobExecution` / `recordDbQuery`** from `lib/observability/metrics.ts` for performance/error-rate counters instead of emitting log lines.
