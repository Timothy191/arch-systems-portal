# Performance Monitoring & Profiling

<cite>
**Referenced Files in This Document**
- [WebVitalsReporter.tsx](file://apps/portal/components/WebVitalsReporter.tsx)
- [PerformanceListener.tsx](file://apps/portal/components/PerformanceListener.tsx)
- [useAdaptivePerformance.ts](file://apps/portal/hooks/useAdaptivePerformance.ts)
- [useSystemMetrics.ts](file://apps/portal/hooks/useSystemMetrics.ts)
- [metrics.ts](file://apps/portal/lib/observability/metrics.ts)
- [instrumentation.ts](file://apps/portal/instrumentation.ts)
- [sentry.client.config.ts](file://apps/portal/sentry.client.config.ts)
- [lighthouserc.json](file://lighthouserc.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains the performance monitoring and profiling capabilities integrated into the application. It covers:
- Web Vitals reporting for Core Web Vitals metrics
- Custom performance listeners for application-specific metrics
- System metrics collection hooks
- Server-side observability (OpenTelemetry and Sentry)
- CI performance budgets via Lighthouse
- Techniques for bottleneck identification, regression detection, dashboards/alerting setup, A/B testing strategies, and continuous performance monitoring

## Project Structure
The performance-related code is primarily located under the portal app with supporting configuration at the repository root.

```mermaid
graph TB
subgraph "Portal App"
WVR["WebVitalsReporter.tsx"]
PL["PerformanceListener.tsx"]
UAP["useAdaptivePerformance.ts"]
USM["useSystemMetrics.ts"]
MET["metrics.ts"]
INST["instrumentation.ts"]
SEN["sentry.client.config.ts"]
end
subgraph "Repo Root"
LH["lighthouserc.json"]
end
WVR --> |sets body attributes<br/>and sessionStorage| Browser["Browser DOM / Storage"]
PL --> UAP
UAP --> |class toggle on body| Browser
USM --> |updates UI state| Browser
MET --> |local maps + Redis sync| Redis["Redis (optional)"]
INST --> |OTLP traces + Sentry init| OTel["OTLP Exporter"]
INST --> Sentry["Sentry (Node/Edge)"]
SEN --> Sentry
LH --> |CI assertions| LHR["Lighthouse CI"]
```

**Diagram sources**
- [WebVitalsReporter.tsx:1-66](file://apps/portal/components/WebVitalsReporter.tsx#L1-L66)
- [PerformanceListener.tsx:1-29](file://apps/portal/components/PerformanceListener.tsx#L1-L29)
- [useAdaptivePerformance.ts:1-83](file://apps/portal/hooks/useAdaptivePerformance.ts#L1-L83)
- [useSystemMetrics.ts:1-107](file://apps/portal/hooks/useSystemMetrics.ts#L1-L107)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)
- [sentry.client.config.ts:1-23](file://apps/portal/sentry.client.config.ts#L1-L23)
- [lighthouserc.json:1-37](file://lighthouserc.json#L1-L37)

**Section sources**
- [WebVitalsReporter.tsx:1-66](file://apps/portal/components/WebVitalsReporter.tsx#L1-L66)
- [PerformanceListener.tsx:1-29](file://apps/portal/components/PerformanceListener.tsx#L1-L29)
- [useAdaptivePerformance.ts:1-83](file://apps/portal/hooks/useAdaptivePerformance.ts#L1-L83)
- [useSystemMetrics.ts:1-107](file://apps/portal/hooks/useSystemMetrics.ts#L1-L107)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)
- [sentry.client.config.ts:1-23](file://apps/portal/sentry.client.config.ts#L1-L23)
- [lighthouserc.json:1-37](file://lighthouserc.json#L1-L37)

## Core Components
- Web Vitals Reporter: Captures Core Web Vitals in production by stamping data attributes on the body and aggregating recent samples in sessionStorage; logs in development.
- Adaptive Performance Listener: Measures frame timing to detect sustained low FPS and toggles a CSS class to enable fallback rendering paths.
- System Metrics Hook: Tracks simulated websocket latency, server time in SAST, current shift, and online status.
- Observability Metrics: Records job and database operation durations and error counts locally and synchronizes to Redis when available.
- OpenTelemetry and Sentry: Initializes tracing and error tracking across Node and Edge runtimes; exports traces via OTLP.
- Lighthouse CI: Enforces performance budgets and thresholds in CI.

**Section sources**
- [WebVitalsReporter.tsx:1-66](file://apps/portal/components/WebVitalsReporter.tsx#L1-L66)
- [PerformanceListener.tsx:1-29](file://apps/portal/components/PerformanceListener.tsx#L1-L29)
- [useAdaptivePerformance.ts:1-83](file://apps/portal/hooks/useAdaptivePerformance.ts#L1-L83)
- [useSystemMetrics.ts:1-107](file://apps/portal/hooks/useSystemMetrics.ts#L1-L107)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)
- [sentry.client.config.ts:1-23](file://apps/portal/sentry.client.config.ts#L1-L23)
- [lighthouserc.json:1-37](file://lighthouserc.json#L1-L37)

## Architecture Overview
End-to-end flow from browser metrics to storage and visualization:

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant WVR as "WebVitalsReporter.tsx"
participant DOM as "DOM/body attrs"
participant SS as "sessionStorage"
participant PL as "PerformanceListener.tsx"
participant UAP as "useAdaptivePerformance.ts"
participant USM as "useSystemMetrics.ts"
participant MET as "metrics.ts"
participant Redis as "Redis"
participant INST as "instrumentation.ts"
participant OTel as "OTLP Exporter"
participant Sentry as "Sentry"
Browser->>WVR : "Page load"
WVR->>DOM : "Set data-web-vital-* attributes"
WVR->>SS : "Append recent metric entries"
Browser->>PL : "Mount component"
PL->>UAP : "Subscribe to lowPerf signal"
UAP->>UAP : "Measure requestAnimationFrame deltas"
UAP-->>PL : "lowPerf = true/false"
PL->>DOM : "Toggle .low-perf-fallback class"
Browser->>USM : "Start timers and listeners"
USM-->>Browser : "Update latency/time/shift/online"
Browser->>MET : "Record job/db metrics"
MET->>Redis : "Async hIncrBy updates"
INST->>OTel : "Start NodeSDK + auto-instrumentations"
INST->>Sentry : "Init client (Node/Edge)"
```

**Diagram sources**
- [WebVitalsReporter.tsx:1-66](file://apps/portal/components/WebVitalsReporter.tsx#L1-L66)
- [PerformanceListener.tsx:1-29](file://apps/portal/components/PerformanceListener.tsx#L1-L29)
- [useAdaptivePerformance.ts:1-83](file://apps/portal/hooks/useAdaptivePerformance.ts#L1-L83)
- [useSystemMetrics.ts:1-107](file://apps/portal/hooks/useSystemMetrics.ts#L1-L107)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)

## Detailed Component Analysis

### Web Vitals Reporting
- Purpose: Capture Core Web Vitals (e.g., LCP, CLS, FCP, TTFB, INP) without external network calls.
- Behavior:
  - Development: console logging for quick inspection.
  - Production: writes `data-web-vital-*` attributes to `<body>` for scraping by monitoring tools; maintains last N samples per metric in sessionStorage.
- Integration points:
  - Scrapers can read body attributes or session storage to feed dashboards.
  - No backend writes; designed to be lightweight.

```mermaid
flowchart TD
Start(["useReportWebVitals callback"]) --> DevCheck{"NODE_ENV === development?"}
DevCheck --> |Yes| Log["Console log metric details"] --> End(["Return"])
DevCheck --> |No| SetAttr["Set data-web-vital-* attribute on body"]
SetAttr --> Store["Append entry to sessionStorage (bounded list)"]
Store --> End
```

**Diagram sources**
- [WebVitalsReporter.tsx:1-66](file://apps/portal/components/WebVitalsReporter.tsx#L1-L66)

**Section sources**
- [WebVitalsReporter.tsx:1-66](file://apps/portal/components/WebVitalsReporter.tsx#L1-L66)

### Adaptive Performance Listener
- Purpose: Detect sustained low frame rates and apply a CSS-based fallback strategy.
- Logic:
  - Warm-up period to ignore hydration lag.
  - Sliding window of frames to estimate FPS; if below threshold for a sustained period, mark low performance.
  - If Focus Mode is enabled, immediately trigger fallback.
- Side effects:
  - Adds/removes `.low-perf-fallback` class on `<body>` to drive CSS-level optimizations.

```mermaid
flowchart TD
Init(["Mount hook"]) --> FocusCheck{"Focus Mode enabled?"}
FocusCheck --> |Yes| LowPerfTrue["Set lowPerf=true"] --> End
FocusCheck --> |No| RAF["requestAnimationFrame loop"]
RAF --> Warmup{"Within warm-up window?"}
Warmup --> |Yes| RAF
Warmup --> |No| Window["Maintain sliding window of frame timestamps"]
Window --> Estimate["Estimate FPS over 1.5s window"]
Estimate --> Threshold{"FPS < threshold?"}
Threshold --> |Yes| LowPerfTrue
Threshold --> |No| RAF
LowPerfTrue --> ToggleClass["Add/remove .low-perf-fallback on body"] --> End
```

**Diagram sources**
- [useAdaptivePerformance.ts:1-83](file://apps/portal/hooks/useAdaptivePerformance.ts#L1-L83)
- [PerformanceListener.tsx:1-29](file://apps/portal/components/PerformanceListener.tsx#L1-L29)

**Section sources**
- [useAdaptivePerformance.ts:1-83](file://apps/portal/hooks/useAdaptivePerformance.ts#L1-L83)
- [PerformanceListener.tsx:1-29](file://apps/portal/components/PerformanceListener.tsx#L1-L29)

### System Metrics Hook
- Purpose: Provide runtime system signals for UI and analytics.
- Signals:
  - Simulated websocket latency with jitter and occasional spikes.
  - Server time in SAST.
  - Current operational shift calculation.
  - Online/offline status via browser events.
- Usage: Suitable for HUD displays and operational awareness.

```mermaid
sequenceDiagram
participant Hook as "useSystemMetrics.ts"
participant Clock as "setInterval(1s)"
participant Net as "window online/offline"
participant Latency as "setInterval(3s)"
Hook->>Clock : "Initialize SAST time and shift"
Hook->>Net : "Register event listeners"
Hook->>Latency : "Compute base+jitter+spike latency"
Clock-->>Hook : "Update time and shift"
Net-->>Hook : "Update online flag"
Latency-->>Hook : "Update websocketLatency"
```

**Diagram sources**
- [useSystemMetrics.ts:1-107](file://apps/portal/hooks/useSystemMetrics.ts#L1-L107)

**Section sources**
- [useSystemMetrics.ts:1-107](file://apps/portal/hooks/useSystemMetrics.ts#L1-L107)

### Server-Side Observability (OpenTelemetry + Sentry)
- OpenTelemetry:
  - Dynamically imports Node SDK and auto-instrumentations when an OTLP endpoint is configured.
  - Exports traces via OTLP HTTP exporter.
- Sentry:
  - Initialized for Node and Edge runtimes with environment-aware sampling.
  - Client config includes PII filtering for exceptions.
- Database metrics:
  - Local in-process maps aggregate counts, errors, and total duration for jobs and DB operations.
  - Async synchronization to Redis using hash fields for aggregation.

```mermaid
classDiagram
class Instrumentation {
+register()
}
class OTEL {
+NodeSDK
+autoInstrumentations
+OTLPTraceExporter
}
class SentryClient {
+init(config)
}
class MetricsStore {
+recordJobExecution(jobId, durationMs, success)
+recordDbQuery(table, op, durationMs, success)
+getObservabilityMetrics()
}
class Redis {
+hIncrBy(key, field, value)
+scanIterator(match)
}
Instrumentation --> OTEL : "starts"
Instrumentation --> SentryClient : "initializes"
MetricsStore --> Redis : "syncs asynchronously"
```

**Diagram sources**
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)
- [sentry.client.config.ts:1-23](file://apps/portal/sentry.client.config.ts#L1-L23)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)

**Section sources**
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)
- [sentry.client.config.ts:1-23](file://apps/portal/sentry.client.config.ts#L1-L23)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)

### CI Performance Budgets (Lighthouse)
- Configuration enforces minimum category scores and maximum numeric thresholds for key metrics.
- Targets multiple routes to ensure broad coverage.
- Integrates into CI pipelines to block regressions based on defined budgets.

```mermaid
flowchart TD
Run["Run Lighthouse CI"] --> Collect["Collect metrics on target URLs"]
Collect --> Assert["Assert against thresholds"]
Assert --> Pass{"All assertions pass?"}
Pass --> |Yes| Continue["Continue pipeline"]
Pass --> |No| Fail["Fail build with report"]
```

**Diagram sources**
- [lighthouserc.json:1-37](file://lighthouserc.json#L1-L37)

**Section sources**
- [lighthouserc.json:1-37](file://lighthouserc.json#L1-L37)

## Dependency Analysis
- Client components depend on React hooks and browser APIs (requestAnimationFrame, sessionStorage, DOM).
- Server instrumentation depends on optional OTLP exporter and Sentry initialization.
- Metrics store depends on optional Redis availability; gracefully falls back to local memory.

```mermaid
graph LR
WVR["WebVitalsReporter.tsx"] --> DOM["DOM/body"]
WVR --> SS["sessionStorage"]
PL["PerformanceListener.tsx"] --> UAP["useAdaptivePerformance.ts"]
UAP --> DOM
USM["useSystemMetrics.ts"] --> BrowserAPI["Browser APIs"]
MET["metrics.ts"] --> LocalMap["Local Maps"]
MET --> Redis["Redis (optional)"]
INST["instrumentation.ts"] --> OTel["OTLP Exporter"]
INST --> Sentry["Sentry"]
```

**Diagram sources**
- [WebVitalsReporter.tsx:1-66](file://apps/portal/components/WebVitalsReporter.tsx#L1-L66)
- [PerformanceListener.tsx:1-29](file://apps/portal/components/PerformanceListener.tsx#L1-L29)
- [useAdaptivePerformance.ts:1-83](file://apps/portal/hooks/useAdaptivePerformance.ts#L1-L83)
- [useSystemMetrics.ts:1-107](file://apps/portal/hooks/useSystemMetrics.ts#L1-L107)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)

**Section sources**
- [WebVitalsReporter.tsx:1-66](file://apps/portal/components/WebVitalsReporter.tsx#L1-L66)
- [PerformanceListener.tsx:1-29](file://apps/portal/components/PerformanceListener.tsx#L1-L29)
- [useAdaptivePerformance.ts:1-83](file://apps/portal/hooks/useAdaptivePerformance.ts#L1-L83)
- [useSystemMetrics.ts:1-107](file://apps/portal/hooks/useSystemMetrics.ts#L1-L107)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)

## Performance Considerations
- Keep Web Vitals reporter lightweight: avoid network calls; rely on DOM attributes and sessionStorage for scraping.
- Adaptive performance: tune warm-up and FPS thresholds to balance false positives and responsiveness.
- Metrics store: prefer Redis-backed aggregation in multi-instance deployments; use fire-and-forget updates to avoid blocking hot paths.
- Tracing: adjust sample rates for production to control overhead while retaining visibility.
- Lighthouse budgets: set realistic thresholds aligned with user experience goals; expand URL coverage as features grow.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Web Vitals not appearing:
  - Verify that the reporter is mounted and that body attributes are present in production builds.
  - Check sessionStorage availability and capacity limits.
- Adaptive fallback not triggering:
  - Confirm focus mode behavior and frame measurement logic; inspect whether warm-up window is masking early issues.
- System metrics stale:
  - Ensure intervals are running and event listeners are attached; verify timezone and shift computation.
- Missing server metrics:
  - Validate Redis connectivity; confirm async sync paths are not failing silently.
- Traces not exported:
  - Ensure OTLP endpoint is configured and Node SDK starts only in Node runtime.
- Errors not captured:
  - Confirm Sentry DSN and environment variables; check PII filtering rules.

**Section sources**
- [WebVitalsReporter.tsx:1-66](file://apps/portal/components/WebVitalsReporter.tsx#L1-L66)
- [useAdaptivePerformance.ts:1-83](file://apps/portal/hooks/useAdaptivePerformance.ts#L1-L83)
- [useSystemMetrics.ts:1-107](file://apps/portal/hooks/useSystemMetrics.ts#L1-L107)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)
- [sentry.client.config.ts:1-23](file://apps/portal/sentry.client.config.ts#L1-L23)

## Conclusion
The application integrates a comprehensive performance monitoring stack:
- Client-side Web Vitals and adaptive rendering controls provide immediate insights and automatic fallbacks.
- System metrics hooks support operational dashboards.
- Server-side tracing and error tracking offer deep diagnostics.
- CI budgets enforce quality gates.
Together, these pieces enable proactive bottleneck identification, regression detection, and continuous performance improvement.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Monitoring Dashboards Setup
- Data sources:
  - Body attributes and sessionStorage for Web Vitals scraping.
  - Redis keys for job and DB metrics summaries.
  - OTLP traces for distributed tracing.
- Visualization:
  - Use a dashboard tool to scrape body attributes/session storage, query Redis, and visualize OTLP traces.
- Example queries:
  - Job metrics: count, errors, average duration per job ID.
  - DB metrics: count, errors, average duration per table:operation.
  - Web Vitals: latest values from body attributes or aggregated from session storage.

[No sources needed since this section provides general guidance]

### Alerting Configurations
- Error rate alerts:
  - Trigger on elevated error counts from job or DB metrics.
- Latency alerts:
  - Alert when average DB or job durations exceed thresholds.
- Web Vitals alerts:
  - Alert when LCP/CLS/TTFB/INP breach budgeted thresholds.
- Trace anomalies:
  - Alert on increased p95/p99 latencies or error spans.

[No sources needed since this section provides general guidance]

### Performance Budget Enforcement
- Define budgets in Lighthouse CI for critical routes and metrics.
- Gate merges on passing budgets; publish reports for review.
- Periodically revisit thresholds based on real-world baselines.

**Section sources**
- [lighthouserc.json:1-37](file://lighthouserc.json#L1-L37)

### Production Performance Analysis
- Use OTLP traces to identify slow endpoints and database queries.
- Correlate Web Vitals spikes with deployment changes.
- Review Redis-backed metrics for long-tail latency and error trends.
- Inspect Sentry for crash patterns and regressions.

**Section sources**
- [instrumentation.ts:1-61](file://apps/portal/instrumentation.ts#L1-L61)
- [metrics.ts:1-184](file://apps/portal/lib/observability/metrics.ts#L1-L184)
- [sentry.client.config.ts:1-23](file://apps/portal/sentry.client.config.ts#L1-L23)

### A/B Testing for Performance Improvements
- Feature flags to toggle heavy UI elements or animations.
- Measure impact via Web Vitals and adaptive performance signals.
- Compare distributions across variants using dashboards.

[No sources needed since this section provides general guidance]

### Continuous Performance Monitoring Strategies
- Integrate Lighthouse CI into PR checks.
- Maintain rolling dashboards for Web Vitals, job/DB metrics, and traces.
- Establish alerting policies tied to budgets and SLOs.
- Regularly audit thresholds and refine adaptive performance parameters.

[No sources needed since this section provides general guidance]