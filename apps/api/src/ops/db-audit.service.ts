import { Injectable, Inject, Logger } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────

export interface TableAudit {
  tableName: string;
  rowCount: number;
  rlsEnabled: boolean;
  hasAuditTrigger: boolean;
  issues: TableIssue[];
}

export interface TableIssue {
  severity: "error" | "warning" | "info";
  category: IssueCategory;
  message: string;
  count: number;
  detail: string;
  repairSql?: string;
}

export type IssueCategory =
  | "orphaned_rows"
  | "missing_required"
  | "duplicates"
  | "stale_data"
  | "rls_disabled"
  | "no_audit_trigger"
  | "constraint_violation"
  | "suspicious_null"
  | "data_anomaly";

export interface AuditReport {
  id: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalTables: number;
  tablesScanned: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issuesByCategory: Record<IssueCategory, number>;
  tables: TableAudit[];
  summary: string;
}

export interface SafeQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface RepairResult {
  repair: string;
  sql: string;
  affectedRows: number;
  success: boolean;
  error?: string;
}

// ── Audit configuration ────────────────────────────────────

/** Tables to audit — core operational tables + logs */
const AUDIT_TABLES = new Set([
  // Core data
  "departments",
  "employees",
  "machines",
  "daily_logs",
  "machine_hours",
  "fuel_logs",
  "production_logs",
  "hourly_loads",
  "operators",
  "sites",
  "excavator_activity",
  "dozer_rolls",
  "breakdowns",
  "shift_notes",
  "drill_operations",
  "machine_configurations",
  "fleet",
  "equipment",
  "safety_incidents",
  // Logging / audit
  "audit_logs",
  "ai_usage_logs",
  "access_logs",
  "ai_memory",
]);

/** Tables that MUST have an audit trigger */
const TABLES_REQUIRING_AUDIT = new Set([
  "departments",
  "employees",
  "machines",
  "daily_logs",
  "excavator_activity",
  "dozer_rolls",
  "operators",
  "sites",
]);

/** Max rows a safe query can return */
const SAFE_QUERY_MAX_ROWS = 500;
const SAFE_QUERY_TIMEOUT_MS = 10_000;

/** Allowed read-only SQL patterns for safe queries */
const ALLOWED_QUERY_PATTERNS = /^\s*SELECT\s+\w/i;

// ── Service ────────────────────────────────────────────────

@Injectable()
export class DbAuditService {
  private readonly logger = new Logger(DbAuditService.name);
  private lastReport: AuditReport | null = null;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  // ── Public API ───────────────────────────────────────────

  getLastReport(): AuditReport | null {
    return this.lastReport;
  }

  async runAudit(): Promise<AuditReport> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    const id = crypto.randomUUID();

    const tables: TableAudit[] = [];
    let totalIssues = 0;
    const issuesByCategory: Record<IssueCategory, number> = {
      orphaned_rows: 0,
      missing_required: 0,
      duplicates: 0,
      stale_data: 0,
      rls_disabled: 0,
      no_audit_trigger: 0,
      constraint_violation: 0,
      suspicious_null: 0,
      data_anomaly: 0,
    };

    for (const tableName of AUDIT_TABLES) {
      try {
        const audit = await this.auditTable(tableName);
        tables.push(audit);
        totalIssues += audit.issues.length;
        for (const issue of audit.issues) {
          issuesByCategory[issue.category] =
            (issuesByCategory[issue.category] ?? 0) + issue.count;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Audit failed for ${tableName}: ${message}`);
        tables.push({
          tableName,
          rowCount: -1,
          rlsEnabled: false,
          hasAuditTrigger: false,
          issues: [
            {
              severity: "error",
              category: "constraint_violation",
              message: `Could not scan table: ${message}`,
              count: 1,
              detail: message,
            },
          ],
        });
        totalIssues++;
      }
    }

    const errorCount = tables.reduce(
      (sum, t) => sum + t.issues.filter((i) => i.severity === "error").length,
      0,
    );
    const warningCount = tables.reduce(
      (sum, t) => sum + t.issues.filter((i) => i.severity === "warning").length,
      0,
    );
    const infoCount = tables.reduce(
      (sum, t) => sum + t.issues.filter((i) => i.severity === "info").length,
      0,
    );

    const report: AuditReport = {
      id,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
      totalTables: AUDIT_TABLES.size,
      tablesScanned: tables.length,
      totalIssues,
      errorCount,
      warningCount,
      infoCount,
      issuesByCategory,
      tables,
      summary: this.summarize(
        totalIssues,
        errorCount,
        warningCount,
        tables.length,
      ),
    };

    this.lastReport = report;
    this.logger.log(
      `Audit complete: ${report.totalIssues} issues (${report.errorCount} errors, ${report.warningCount} warnings) in ${report.durationMs}ms`,
    );
    return report;
  }

  async runRepair(
    tableName: string,
    issueCategory: IssueCategory,
  ): Promise<RepairResult> {
    const repair = this.getRepairSql(tableName, issueCategory);
    if (!repair) {
      return {
        repair: issueCategory,
        sql: "",
        affectedRows: 0,
        success: false,
        error: `No repair strategy for ${issueCategory} on ${tableName}`,
      };
    }

    try {
      const { error, count } = await this.supabase.rpc("exec_sql", {
        sql: repair,
      });

      if (error) {
        return {
          repair: issueCategory,
          sql: repair,
          affectedRows: 0,
          success: false,
          error: error.message,
        };
      }

      return {
        repair: issueCategory,
        sql: repair,
        affectedRows: count ?? 0,
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        repair: issueCategory,
        sql: repair,
        affectedRows: 0,
        success: false,
        error: message,
      };
    }
  }

  /** Run a safe read-only query. Only SELECT allowed; max 500 rows; 10s timeout. */
  async runSafeQuery(sql: string): Promise<SafeQueryResult> {
    if (!ALLOWED_QUERY_PATTERNS.test(sql)) {
      throw new Error("Only SELECT queries are allowed");
    }

    const limitedSql = `SET LOCAL statement_timeout = '${SAFE_QUERY_TIMEOUT_MS}ms';
SELECT * FROM (${sql}) AS _sub LIMIT ${SAFE_QUERY_MAX_ROWS + 1};`;

    const { data, error } = await this.supabase.rpc("exec_sql", {
      sql: limitedSql,
    });

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    const rows = (data as Record<string, unknown>[]) ?? [];
    const truncated = rows.length > SAFE_QUERY_MAX_ROWS;
    if (truncated) {
      rows.length = SAFE_QUERY_MAX_ROWS;
    }

    const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      truncated,
    };
  }

  // ── Per-table audit ──────────────────────────────────────

  private async auditTable(tableName: string): Promise<TableAudit> {
    const issues: TableIssue[] = [];

    const [rowCount, rlsEnabled, hasTrigger] = await Promise.all([
      this.getRowCount(tableName),
      this.checkRlsEnabled(tableName),
      this.checkAuditTrigger(tableName),
    ]);

    if (!rlsEnabled) {
      issues.push({
        severity: "error",
        category: "rls_disabled",
        message: `${tableName} does not have Row Level Security enabled`,
        count: 1,
        detail:
          "Critical security gap — data accessible to all authenticated users",
        repairSql: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`,
      });
    }

    if (TABLES_REQUIRING_AUDIT.has(tableName) && !hasTrigger) {
      issues.push({
        severity: "warning",
        category: "no_audit_trigger",
        message: `${tableName} missing audit trigger`,
        count: 1,
        detail: "Changes to this table are not recorded in audit_logs",
      });
    }

    // Run data integrity checks
    const dataIssues = await this.checkDataIntegrity(tableName);
    issues.push(...dataIssues);

    return {
      tableName,
      rowCount,
      rlsEnabled,
      hasAuditTrigger: hasTrigger,
      issues,
    };
  }

  // ── Integrity checks ─────────────────────────────────────

  private async checkDataIntegrity(tableName: string): Promise<TableIssue[]> {
    const issues: TableIssue[] = [];
    const tableKey = tableName as keyof typeof INTEGRITY_CHECKS;
    const checks = INTEGRITY_CHECKS[tableKey];
    if (!checks) return issues;

    for (const check of checks) {
      try {
        const result = await this.runCheck(tableName, check);
        if (result) issues.push(result);
      } catch {
        // Skip checks that fail (e.g. column doesn't exist)
      }
    }

    return issues;
  }

  private async runCheck(
    tableName: string,
    check: IntegrityCheck,
  ): Promise<TableIssue | null> {
    if (check.type === "required_fields") {
      const missing = await this.countNulls(tableName, check.columns ?? []);
      for (const [col, count] of Object.entries(missing)) {
        if (count > 0) {
          return {
            severity: "warning",
            category: "missing_required",
            message: `${count} rows in ${tableName} have NULL ${col}`,
            count,
            detail: `Column "${col}" should be NOT NULL but has ${count} null values`,
          };
        }
      }
    }

    if (check.type === "orphan_check") {
      for (const fk of check.foreignKeys ?? []) {
        const orphans = await this.countOrphans(
          tableName,
          fk.column,
          fk.refTable,
          fk.refColumn,
        );
        if (orphans > 0) {
          const detail = `${orphans} ${tableName}.${fk.column} values reference non-existent ${fk.refTable}.${fk.refColumn}`;
          return {
            severity: "error",
            category: "orphaned_rows",
            message: detail,
            count: orphans,
            detail,
            repairSql: `DELETE FROM ${tableName} WHERE ${fk.column} IS NOT NULL AND ${fk.column} NOT IN (SELECT ${fk.refColumn} FROM ${fk.refTable});`,
          };
        }
      }
    }

    if (check.type === "duplicate_check") {
      for (const col of check.columns ?? []) {
        const dups = await this.countDuplicates(tableName, col);
        if (dups > 0) {
          return {
            severity: "warning",
            category: "duplicates",
            message: `${dups} duplicate values in ${tableName}.${col}`,
            count: dups,
            detail: `Found ${dups} rows sharing non-unique values in "${col}"`,
          };
        }
      }
    }

    if (check.type === "stale_data" && check.filterDateColumn) {
      const stale = await this.countStale(
        tableName,
        check.filterDateColumn,
        check.staleDays ?? 90,
      );
      if (stale > 0) {
        return {
          severity: "info",
          category: "stale_data",
          message: `${stale} stale records in ${tableName} (older than ${check.staleDays} days)`,
          count: stale,
          detail: `Records where ${check.filterDateColumn} < NOW() - ${check.staleDays} days`,
          repairSql: `DELETE FROM ${tableName} WHERE ${check.filterDateColumn} < NOW() - INTERVAL '${check.staleDays} days';`,
        };
      }
    }

    return null;
  }

  // ── SQL helpers ──────────────────────────────────────────

  private async getRowCount(tableName: string): Promise<number> {
    const { count, error } = await this.supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      this.logger.warn(`Cannot count ${tableName}: ${error.message}`);
      return -1;
    }
    return count ?? 0;
  }

  private async checkRlsEnabled(tableName: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc("check_rls_enabled", {
      table_name: tableName,
    });
    if (error) {
      // Fallback: query pg_class directly via raw SQL
      return this.fallbackRlsCheck(tableName);
    }
    return data as boolean;
  }

  private async fallbackRlsCheck(tableName: string): Promise<boolean> {
    try {
      const { data } = await this.supabase.rpc("exec_sql", {
        sql: `SELECT relrowsecurity FROM pg_class WHERE relname = '${tableName}';`,
      });
      return (
        (data as [{ relrowsecurity: boolean }] | null)?.[0]?.relrowsecurity ??
        false
      );
    } catch {
      return false;
    }
  }

  private async checkAuditTrigger(tableName: string): Promise<boolean> {
    try {
      const { data } = await this.supabase.rpc("exec_sql", {
        sql: `SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_${tableName}');`,
      });
      return (data as [{ exists: boolean }] | null)?.[0]?.exists ?? false;
    } catch {
      return false;
    }
  }

  private async countNulls(
    tableName: string,
    columns: string[],
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const col of columns) {
      try {
        const { data, error } = await this.supabase.rpc("exec_sql", {
          sql: `SELECT COUNT(*) AS cnt FROM "${tableName}" WHERE "${col}" IS NULL;`,
        });
        if (!error && data) {
          const row = (data as [{ cnt: number }] | null)?.[0];
          if (row && row.cnt > 0) result[col] = row.cnt;
        }
      } catch {
        // column probably doesn't exist
      }
    }
    return result;
  }

  private async countOrphans(
    tableName: string,
    column: string,
    refTable: string,
    refColumn: string,
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc("exec_sql", {
        sql: `SELECT COUNT(*) AS cnt FROM "${tableName}" t WHERE t."${column}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "${refTable}" r WHERE r."${refColumn}" = t."${column}");`,
      });
      if (error) return 0;
      return (data as [{ cnt: number }] | null)?.[0]?.cnt ?? 0;
    } catch {
      return 0;
    }
  }

  private async countDuplicates(
    tableName: string,
    column: string,
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc("exec_sql", {
        sql: `SELECT COUNT(*) - COUNT(DISTINCT "${column}") AS cnt FROM "${tableName}";`,
      });
      if (error) return 0;
      return (data as [{ cnt: number }] | null)?.[0]?.cnt ?? 0;
    } catch {
      return 0;
    }
  }

  private async countStale(
    tableName: string,
    dateColumn: string,
    days: number,
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc("exec_sql", {
        sql: `SELECT COUNT(*) AS cnt FROM "${tableName}" WHERE "${dateColumn}" < NOW() - INTERVAL '${days} days';`,
      });
      if (error) return 0;
      return (data as [{ cnt: number }] | null)?.[0]?.cnt ?? 0;
    } catch {
      return 0;
    }
  }

  // ── Repair ───────────────────────────────────────────────

  private getRepairSql(
    tableName: string,
    category: IssueCategory,
  ): string | null {
    const tableKey = tableName as keyof typeof INTEGRITY_CHECKS;
    const checks = INTEGRITY_CHECKS[tableKey];
    if (!checks) return null;

    for (const check of checks) {
      if (check.type === "orphan_check" && category === "orphaned_rows") {
        for (const fk of check.foreignKeys ?? []) {
          return `DELETE FROM "${tableName}" WHERE "${fk.column}" IS NOT NULL AND "${fk.column}" NOT IN (SELECT "${fk.refColumn}" FROM "${fk.refTable}");`;
        }
      }
      if (
        check.type === "stale_data" &&
        category === "stale_data" &&
        check.filterDateColumn
      ) {
        return `DELETE FROM "${tableName}" WHERE "${check.filterDateColumn}" < NOW() - INTERVAL '${check.staleDays} days';`;
      }
    }

    return null;
  }

  // ── Summary ──────────────────────────────────────────────

  private summarize(
    totalIssues: number,
    errors: number,
    warnings: number,
    scanned: number,
  ): string {
    const parts: string[] = [];
    if (errors > 0) parts.push(`${errors} error(s)`);
    if (warnings > 0) parts.push(`${warnings} warning(s)`);
    const prefix =
      parts.length > 0 ? `${parts.join(", ")} found. ` : "No issues found. ";
    return `${prefix}Scanned ${scanned}/${AUDIT_TABLES.size} tables. Total: ${totalIssues} items.`;
  }
}

// ── Integrity check definitions ─────────────────────────────

interface ForeignKeyRef {
  column: string;
  refTable: string;
  refColumn: string;
}

interface IntegrityCheck {
  type: "required_fields" | "orphan_check" | "duplicate_check" | "stale_data";
  columns?: string[];
  foreignKeys?: ForeignKeyRef[];
  filterDateColumn?: string;
  staleDays?: number;
}

const INTEGRITY_CHECKS: Partial<Record<string, IntegrityCheck[]>> = {
  daily_logs: [
    {
      type: "required_fields",
      columns: ["department_id", "log_date", "shift"],
    },
    {
      type: "orphan_check",
      foreignKeys: [
        { column: "department_id", refTable: "departments", refColumn: "id" },
      ],
    },
    {
      type: "duplicate_check",
      columns: ["id"],
    },
    {
      type: "stale_data",
      filterDateColumn: "created_at",
      staleDays: 365,
    },
  ],
  machine_hours: [
    {
      type: "orphan_check",
      foreignKeys: [
        { column: "daily_log_id", refTable: "daily_logs", refColumn: "id" },
        { column: "machine_id", refTable: "machines", refColumn: "id" },
      ],
    },
  ],
  fuel_logs: [
    {
      type: "orphan_check",
      foreignKeys: [
        { column: "daily_log_id", refTable: "daily_logs", refColumn: "id" },
        { column: "machine_id", refTable: "machines", refColumn: "id" },
      ],
    },
  ],
  production_logs: [
    {
      type: "orphan_check",
      foreignKeys: [
        { column: "daily_log_id", refTable: "daily_logs", refColumn: "id" },
      ],
    },
  ],
  employees: [
    {
      type: "orphan_check",
      foreignKeys: [
        { column: "department_id", refTable: "departments", refColumn: "id" },
      ],
    },
  ],
  machines: [
    {
      type: "orphan_check",
      foreignKeys: [
        { column: "department_id", refTable: "departments", refColumn: "id" },
      ],
    },
  ],
  audit_logs: [
    {
      type: "orphan_check",
      foreignKeys: [
        { column: "department_id", refTable: "departments", refColumn: "id" },
      ],
    },
    {
      type: "stale_data",
      filterDateColumn: "created_at",
      staleDays: 90,
    },
  ],
  ai_usage_logs: [
    {
      type: "stale_data",
      filterDateColumn: "created_at",
      staleDays: 180,
    },
  ],
  access_logs: [
    {
      type: "stale_data",
      filterDateColumn: "created_at",
      staleDays: 90,
    },
  ],
  breakdowns: [
    {
      type: "required_fields",
      columns: ["machine_id"],
    },
    {
      type: "orphan_check",
      foreignKeys: [
        { column: "machine_id", refTable: "machines", refColumn: "id" },
      ],
    },
  ],
};
