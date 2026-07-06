# Security Logs & Audit Trails

<cite>
**Referenced Files in This Document**
- [audit.ts](file://apps/portal/lib/audit.ts)
- [error-logger.ts](file://apps/portal/lib/errors/error-logger.ts)
- [007_audit_logs.sql](file://packages/database/migrations/007_audit_logs.sql)
- [011_automated_auditing.sql](file://packages/database/migrations/011_automated_auditing.sql)
- [033_access_logs_weekly_archival.sql](file://packages/database/migrations/033_access_logs_weekly_archival.sql)
- [039_access_logs_operator_device.sql](file://packages/database/migrations/039_access_logs_operator_device.sql)
- [database-schema.md](file://wiki/concepts/database-schema.md)
- [access-control/page.tsx](file://apps/portal/app/(departments)/access-control/page.tsx)
- [DashboardActivityFeed.tsx](file://apps/portal/app/(departments)/access-control/components/DashboardActivityFeed.tsx)
- [access-logs/page.tsx](file://apps/portal/app/(departments)/access-control/access-logs/page.tsx)
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

This document describes the security logging and audit trail system, focusing on:

- Log collection mechanisms for application-level audits and access events
- Event types captured by the audit system
- Data retention policies for access logs
- Access log data model including timestamps, user actions, and access attempts
- Filtering, search capabilities, and export functionality
- Real-time streaming considerations, alerting rules, and compliance reporting
- Activity feed components used in security monitoring dashboards

The system combines server-side audit logging with database triggers and a dedicated access log table with weekly archival. It integrates error tracking via an external service and provides UI components for activity feeds and access log browsing.

## Project Structure

Security-related code is primarily located under the portal application and database migrations:

- Server-side audit logging utility
- Error logger integration with an external monitoring service
- Database schema and automated auditing triggers
- Weekly archival process for access logs
- UI components for access control dashboards and activity feeds

```mermaid
graph TB
subgraph "Portal App"
A["Server Audit Utility<br/>apps/portal/lib/audit.ts"]
B["Error Logger<br/>apps/portal/lib/errors/error-logger.ts"]
C["Access Control Dashboard<br/>apps/portal/app/(departments)/access-control/page.tsx"]
D["Activity Feed Component<br/>components/DashboardActivityFeed.tsx"]
E["Access Logs Page<br/>apps/portal/app/(departments)/access-control/access-logs/page.tsx"]
end
subgraph "Database (Supabase)"
F["audit_logs table<br/>migrations/007_audit_logs.sql"]
G["Automated Triggers<br/>migrations/011_automated_auditing.sql"]
H["Access Logs + Archive<br/>migrations/033_access_logs_weekly_archival.sql"]
I["Operator/Device Fields<br/>migrations/039_access_logs_operator_device.sql"]
end
A --> F
G --> F
C --> E
D --> C
E --> H
H --> I
B --> |"Sentry"| J["External Monitoring Service"]
```

**Diagram sources**

- [audit.ts:1-57](file://apps/portal/lib/audit.ts#L1-L57)
- [error-logger.ts:1-242](file://apps/portal/lib/errors/error-logger.ts#L1-L242)
- [007_audit_logs.sql:1-46](file://packages/database/migrations/007_audit_logs.sql#L1-L46)
- [011_automated_auditing.sql:1-97](file://packages/database/migrations/011_automated_auditing.sql#L1-L97)
- [033_access_logs_weekly_archival.sql:1-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L1-L87)
- [039_access_logs_operator_device.sql:1-14](file://packages/database/migrations/039_access_logs_operator_device.sql#L1-L14)
- [access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx#L77-L119>)
- [DashboardActivityFeed.tsx](<file://apps/portal/app/(departments)/access-control/components/DashboardActivityFeed.tsx#L1-L39>)
- [access-logs/page.tsx](<file://apps/portal/app/(departments)/access-control/access-logs/page.tsx#L128-L162>)

**Section sources**

- [audit.ts:1-57](file://apps/portal/lib/audit.ts#L1-L57)
- [error-logger.ts:1-242](file://apps/portal/lib/errors/error-logger.ts#L1-L242)
- [007_audit_logs.sql:1-46](file://packages/database/migrations/007_audit_logs.sql#L1-L46)
- [011_automated_auditing.sql:1-97](file://packages/database/migrations/011_automated_auditing.sql#L1-L97)
- [033_access_logs_weekly_archival.sql:1-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L1-L87)
- [039_access_logs_operator_device.sql:1-14](file://packages/database/migrations/039_access_logs_operator_device.sql#L1-L14)
- [database-schema.md:204-240](file://wiki/concepts/database-schema.md#L204-L240)
- [access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx#L77-L119>)
- [DashboardActivityFeed.tsx](<file://apps/portal/app/(departments)/access-control/components/DashboardActivityFeed.tsx#L1-L39>)
- [access-logs/page.tsx](<file://apps/portal/app/(departments)/access-control/access-logs/page.tsx#L128-L162>)

## Core Components

- Server-side audit logging utility writes structured audit events to the audit_logs table and invalidates caches when relevant tables change.
- Automated database triggers capture insert/update/delete operations on core tables into audit_logs without requiring application changes.
- Access logs are maintained in a dedicated table with weekly archival to an archive table and additional fields for operator and device identification.
- Error logger captures structured errors and forwards them to an external monitoring service while preserving console output for local debugging.
- UI components provide activity feeds and access log browsing for security monitoring dashboards.

**Section sources**

- [audit.ts:1-57](file://apps/portal/lib/audit.ts#L1-L57)
- [011_automated_auditing.sql:1-97](file://packages/database/migrations/011_automated_auditing.sql#L1-L97)
- [033_access_logs_weekly_archival.sql:1-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L1-L87)
- [039_access_logs_operator_device.sql:1-14](file://packages/database/migrations/039_access_logs_operator_device.sql#L1-L14)
- [error-logger.ts:1-242](file://apps/portal/lib/errors/error-logger.ts#L1-L242)
- [access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx#L77-L119>)
- [DashboardActivityFeed.tsx](<file://apps/portal/app/(departments)/access-control/components/DashboardActivityFeed.tsx#L1-L39>)
- [access-logs/page.tsx](<file://apps/portal/app/(departments)/access-control/access-logs/page.tsx#L128-L162>)

## Architecture Overview

The audit and access logging architecture spans application code, database triggers, and UI components:

```mermaid
sequenceDiagram
participant Client as "Client"
participant Portal as "Portal App"
participant AuditUtil as "Audit Utility"
participant DB as "Supabase DB"
participant Trigger as "Audit Trigger Function"
participant Archive as "Weekly Archival Job"
participant UI as "Access Logs UI"
Client->>Portal : "Perform action"
Portal->>AuditUtil : "logAuditEvent(input)"
AuditUtil->>DB : "INSERT audit_logs"
DB-->>AuditUtil : "OK"
AuditUtil->>Portal : "Cache invalidation"
Note over DB,Trigger : "Automated triggers on core tables"
DB->>Trigger : "AFTER INSERT/UPDATE/DELETE"
Trigger->>DB : "INSERT audit_logs"
Note over DB,Archive : "Weekly archival"
Archive->>DB : "Move older rows to access_logs_archive"
UI->>DB : "Query access_logs / archive"
DB-->>UI : "Logs for dashboard"
```

**Diagram sources**

- [audit.ts:1-57](file://apps/portal/lib/audit.ts#L1-L57)
- [011_automated_auditing.sql:1-97](file://packages/database/migrations/011_automated_auditing.sql#L1-L97)
- [033_access_logs_weekly_archival.sql:1-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L1-L87)
- [access-logs/page.tsx](<file://apps/portal/app/(departments)/access-control/access-logs/page.tsx#L128-L162>)

## Detailed Component Analysis

### Audit Logging Utility

- Purpose: Write structured audit events to the audit_logs table from server actions.
- Behavior:
  - Resolves current authenticated user and maps to employee record.
  - Inserts audit event with action, table name, record ID, old/new data, performer, and department context.
  - Invalidates cache tags for affected tables to keep UI consistent.
- Error handling: Throws unauthorized error if no valid session exists.

```mermaid
flowchart TD
Start(["logAuditEvent Entry"]) --> AuthCheck["Resolve authenticated user"]
AuthCheck --> UserFound{"User found?"}
UserFound --> |No| ThrowAuth["Throw Unauthorized error"]
UserFound --> |Yes| MapEmployee["Map auth_id to employee.id"]
MapEmployee --> InsertLog["Insert audit_logs row"]
InsertLog --> InvalidateCache["Invalidate cache tags for table"]
InvalidateCache --> End(["Exit"])
```

**Diagram sources**

- [audit.ts:1-57](file://apps/portal/lib/audit.ts#L1-L57)

**Section sources**

- [audit.ts:1-57](file://apps/portal/lib/audit.ts#L1-L57)

### Automated Database Auditing Triggers

- Purpose: Automatically capture all mutations on core tables into audit_logs.
- Mechanism:
  - Generic trigger function serializes old/new data and extracts department context.
  - Maps Supabase auth.uid() to employees.id for performed_by.
  - Applies AFTER INSERT/UPDATE/DELETE triggers on departments, employees, machines, operators, sites, daily_logs.

```mermaid
classDiagram
class AuditTrigger {
+process_audit_log()
+captures OLD/NEW JSONB
+maps auth.uid() to employees.id
+inserts into audit_logs
}
class Tables {
+departments
+employees
+machines
+operators
+sites
+daily_logs
}
AuditTrigger --> Tables : "AFTER INSERT/UPDATE/DELETE"
```

**Diagram sources**

- [011_automated_auditing.sql:1-97](file://packages/database/migrations/011_automated_auditing.sql#L1-L97)

**Section sources**

- [011_automated_auditing.sql:1-97](file://packages/database/migrations/011_automated_auditing.sql#L1-L97)

### Access Logs Schema and Retention Policy

- Schema highlights:
  - Dedicated access_logs table for gate/device scan events.
  - Additional columns for operator and device_id to attribute scans.
  - Weekly archival moves older rows into access_logs_archive with week identifiers.
- Retention policy:
  - Active logs retained for the current week.
  - Older logs archived weekly; archive table indexed by archived_week_start and scanned_at.
- RLS:
  - Select policies restrict archive access to admins, access_control roles, or users within the same department.

```mermaid
erDiagram
ACCESS_LOGS {
uuid id PK
timestamptz scanned_at
text entity_type
text entity_name
text status
uuid department_id FK
text operator
text device_id
}
ACCESS_LOGS_ARCHIVE {
uuid id PK
date archived_week_start
timestamptz scanned_at
text entity_type
text entity_name
text status
uuid department_id FK
text operator
text device_id
}
ACCESS_LOGS ||--o{ ACCESS_LOGS_ARCHIVE : "weekly archival"
```

**Diagram sources**

- [033_access_logs_weekly_archival.sql:1-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L1-L87)
- [039_access_logs_operator_device.sql:1-14](file://packages/database/migrations/039_access_logs_operator_device.sql#L1-L14)

**Section sources**

- [033_access_logs_weekly_archival.sql:1-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L1-L87)
- [039_access_logs_operator_device.sql:1-14](file://packages/database/migrations/039_access_logs_operator_device.sql#L1-L14)

### Error Logging Integration

- Purpose: Capture structured errors and forward them to an external monitoring service.
- Behavior:
  - Determines severity based on status codes and error type.
  - Logs to console for development and sends high-severity errors to Sentry.
  - Provides wrappers for API routes and server actions to ensure consistent logging.

```mermaid
sequenceDiagram
participant Handler as "API Route/Action"
participant Logger as "Error Logger"
participant Console as "Console Output"
participant Sentry as "Sentry"
Handler->>Logger : "withErrorLogging(handler)"
Logger->>Handler : "Invoke handler"
Handler-->>Logger : "Throws error"
Logger->>Logger : "createErrorLog()"
Logger->>Console : "Log warn/error"
alt Severity is error/fatal
Logger->>Sentry : "captureException(error, extra)"
end
Logger-->>Handler : "Re-throw error"
```

**Diagram sources**

- [error-logger.ts:1-242](file://apps/portal/lib/errors/error-logger.ts#L1-L242)

**Section sources**

- [error-logger.ts:1-242](file://apps/portal/lib/errors/error-logger.ts#L1-L242)

### Activity Feed and Dashboard Components

- Purpose: Display recent access events and key metrics for security monitoring.
- Features:
  - Activity feed shows recent entries with icons per status and entity type pills.
  - Dashboard aggregates counts like access events today and alerts today.
  - Links to detailed access logs page for filtering and deeper inspection.

```mermaid
graph TB
Dash["Access Control Dashboard<br/>page.tsx"] --> Feed["Activity Feed<br/>DashboardActivityFeed.tsx"]
Dash --> KPI["KPI Cards<br/>metrics"]
Feed --> Detail["Access Logs Page<br/>access-logs/page.tsx"]
```

**Diagram sources**

- [access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx#L77-L119>)
- [DashboardActivityFeed.tsx](<file://apps/portal/app/(departments)/access-control/components/DashboardActivityFeed.tsx#L1-L39>)
- [access-logs/page.tsx](<file://apps/portal/app/(departments)/access-control/access-logs/page.tsx#L128-L162>)

**Section sources**

- [access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx#L77-L119>)
- [DashboardActivityFeed.tsx](<file://apps/portal/app/(departments)/access-control/components/DashboardActivityFeed.tsx#L1-L39>)
- [access-logs/page.tsx](<file://apps/portal/app/(departments)/access-control/access-logs/page.tsx#L128-L162>)

## Dependency Analysis

- Application-to-database dependencies:
  - Audit utility depends on Supabase client and Redis cache invalidation.
  - Automated triggers depend on Supabase auth context and employees mapping.
  - Weekly archival depends on pg_cron scheduling and indexes on archive table.
- UI-to-data dependencies:
  - Dashboard and activity feed rely on access_logs and related metrics.
  - Access logs page queries active and archived logs with filters.

```mermaid
graph LR
AuditUtil["audit.ts"] --> DB["Supabase DB"]
Trigger["011_automated_auditing.sql"] --> DB
Archive["033_access_logs_weekly_archival.sql"] --> DB
OperatorFields["039_access_logs_operator_device.sql"] --> DB
Dashboard["access-control/page.tsx"] --> DB
ActivityFeed["DashboardActivityFeed.tsx"] --> DB
AccessLogsPage["access-logs/page.tsx"] --> DB
ErrorLogger["error-logger.ts"] --> Sentry["Sentry"]
```

**Diagram sources**

- [audit.ts:1-57](file://apps/portal/lib/audit.ts#L1-L57)
- [011_automated_auditing.sql:1-97](file://packages/database/migrations/011_automated_auditing.sql#L1-L97)
- [033_access_logs_weekly_archival.sql:1-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L1-L87)
- [039_access_logs_operator_device.sql:1-14](file://packages/database/migrations/039_access_logs_operator_device.sql#L1-L14)
- [access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx#L77-L119>)
- [DashboardActivityFeed.tsx](<file://apps/portal/app/(departments)/access-control/components/DashboardActivityFeed.tsx#L1-L39>)
- [access-logs/page.tsx](<file://apps/portal/app/(departments)/access-control/access-logs/page.tsx#L128-L162>)
- [error-logger.ts:1-242](file://apps/portal/lib/errors/error-logger.ts#L1-L242)

**Section sources**

- [audit.ts:1-57](file://apps/portal/lib/audit.ts#L1-L57)
- [011_automated_auditing.sql:1-97](file://packages/database/migrations/011_automated_auditing.sql#L1-L97)
- [033_access_logs_weekly_archival.sql:1-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L1-L87)
- [039_access_logs_operator_device.sql:1-14](file://packages/database/migrations/039_access_logs_operator_device.sql#L1-L14)
- [access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx#L77-L119>)
- [DashboardActivityFeed.tsx](<file://apps/portal/app/(departments)/access-control/components/DashboardActivityFeed.tsx#L1-L39>)
- [access-logs/page.tsx](<file://apps/portal/app/(departments)/access-control/access-logs/page.tsx#L128-L162>)
- [error-logger.ts:1-242](file://apps/portal/lib/errors/error-logger.ts#L1-L242)

## Performance Considerations

- Indexes:
  - audit_logs includes indexes on table_name+record_id, performed_by, department_id, created_at DESC.
  - access_logs_archive includes indexes on archived_week_start and scanned_at DESC.
  - access_logs includes index on device_id for device-based queries.
- Archival:
  - Weekly archival reduces active table size and improves query performance for recent logs.
- Cache invalidation:
  - Audit utility invalidates cache tags for affected tables to maintain UI freshness.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

- Unauthorized audit logging:
  - If no valid session exists, audit logging throws an unauthorized error. Verify authentication context before calling audit utilities.
- Missing employee mapping:
  - Automated triggers map auth.uid() to employees.id; ensure employee records exist for authenticated users.
- Archive visibility:
  - Archive select policies restrict access to admins, access_control roles, or matching department membership. Confirm user roles and department assignments.
- Error logging not appearing:
  - Only high-severity errors are forwarded to Sentry; lower severities are logged to console. Check environment configuration and severity thresholds.

**Section sources**

- [audit.ts:1-57](file://apps/portal/lib/audit.ts#L1-L57)
- [011_automated_auditing.sql:1-97](file://packages/database/migrations/011_automated_auditing.sql#L1-L97)
- [033_access_logs_weekly_archival.sql:37-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L37-L87)
- [error-logger.ts:1-242](file://apps/portal/lib/errors/error-logger.ts#L1-L242)

## Conclusion

The security logging and audit trail system provides comprehensive coverage through:

- Server-side audit logging with cache invalidation
- Automated database triggers capturing critical mutations
- Dedicated access logs with weekly archival and role-based access controls
- Structured error logging integrated with an external monitoring service
- UI components for activity feeds and access log browsing

These mechanisms support security monitoring, compliance reporting, and operational insights while maintaining performance and data governance.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Access Log Data Model Summary

- Key fields include timestamps, entity type/name, status, department context, operator, and device identifier.
- Weekly archival separates historical data with week start identifiers and appropriate indexes.

**Section sources**

- [033_access_logs_weekly_archival.sql:1-87](file://packages/database/migrations/033_access_logs_weekly_archival.sql#L1-L87)
- [039_access_logs_operator_device.sql:1-14](file://packages/database/migrations/039_access_logs_operator_device.sql#L1-L14)
- [database-schema.md:204-240](file://wiki/concepts/database-schema.md#L204-L240)
