export interface MetricEntry {
  count: number;
  errors: number;
  totalDurationMs: number;
}

interface ObservabilityMetrics {
  jobMetrics: Map<string, MetricEntry>;
  dbMetrics: Map<string, MetricEntry>;
}

// In-memory metric store
const jobMetrics = new Map<string, MetricEntry>();
const dbMetrics = new Map<string, MetricEntry>();

export function incrementMetric(name: string, value: number = 1) {
  // Stub implementation
}

export function recordMetric(name: string, value: number) {
  // Stub implementation
}

export function recordJobExecution(jobId: string, durationMs: number, success: boolean) {
  const entry = jobMetrics.get(jobId) ?? { count: 0, errors: 0, totalDurationMs: 0 };
  entry.count++;
  if (!success) entry.errors++;
  entry.totalDurationMs += durationMs;
  jobMetrics.set(jobId, entry);
}

export function recordDbQuery(key: string, durationMs: number, success: boolean) {
  const [table = "unknown", operation = "unknown"] = key.split(":");
  const entry = dbMetrics.get(key) ?? { count: 0, errors: 0, totalDurationMs: 0 };
  entry.count++;
  if (!success) entry.errors++;
  entry.totalDurationMs += durationMs;
  dbMetrics.set(key, entry);
}

export async function getObservabilityMetrics(): Promise<ObservabilityMetrics> {
  return {
    jobMetrics: new Map(jobMetrics),
    dbMetrics: new Map(dbMetrics),
  };
}

/** @deprecated Use getObservabilityMetrics */
export const getMetrics = getObservabilityMetrics;