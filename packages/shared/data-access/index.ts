// Placeholder exports for @repo/shared/data-access

export interface AuditLogInput {
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export function logAuditEvent(input: AuditLogInput): void {
  // Placeholder implementation
}