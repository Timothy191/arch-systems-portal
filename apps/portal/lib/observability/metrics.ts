/**
 * Minimal metrics stub for portal server-side code.
 * The full metrics module has been migrated to apps/api.
 * These are no-op stubs to maintain compatibility with portal's
 * instrumentation.ts and proxy.ts until they are also migrated.
 */

export function recordJobExecution(
  _jobId: string,
  _durationMs: number,
  _success: boolean,
): void {
  // No-op: metrics recording moved to apps/api
}

export function recordDbQuery(
  _tableName: string,
  _operation: string,
  _durationMs: number,
  _success: boolean,
): void {
  // No-op: metrics recording moved to apps/api
}
