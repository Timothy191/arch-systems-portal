# Certification Tracking

<cite>
**Referenced Files in This Document**
- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)
- [016_schema_enhancements.sql](file://packages/supabase/migrations/016_schema_enhancements.sql)
- [certifications-page.tsx](file://apps/portal/app/(departments)/training/certifications/page.tsx)
- [training-overview-page.tsx](file://apps/portal/app/(departments)/training/page.tsx)
- [department-features.md](file://wiki/concepts/department-features.md)
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

## Introduction

This document describes the certification tracking system within the Training department. It covers certification types, requirements definition, issuance workflows, employee assignment, completion tracking, expiration monitoring, automated alerts for upcoming expirations, renewal processes, and compliance reporting. It also documents data models, validation rules, integration with employee records, audit trails for changes, and regulatory compliance features.

## Project Structure

The certification tracking capability is part of the Training department feature set and includes:

- A training overview page that highlights recent certifications and status indicators
- A dedicated certifications page that lists, filters, and displays certification statuses
- Database schema documentation describing core tables including certifications and related entities
- Migration enhancements that introduce native enums, audit columns, and generated columns across operational tables

```mermaid
graph TB
subgraph "Portal UI"
TOverview["Training Overview Page"]
TCerts["Certifications Page"]
end
subgraph "Documentation & Schema"
TDeps["Training Department Docs"]
DBSchema["Database Schema Docs"]
Migrations["Schema Enhancements Migration"]
end
TOverview --> TCerts
TCerts --> TDeps
TDeps --> DBSchema
DBSchema --> Migrations
```

**Diagram sources**

- [training-overview-page.tsx](<file://apps/portal/app/(departments)/training/page.tsx>)
- [certifications-page.tsx](<file://apps/portal/app/(departments)/training/certifications/page.tsx>)
- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)
- [016_schema_enhancements.sql](file://packages/supabase/migrations/016_schema_enhancements.sql)

**Section sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)
- [certifications-page.tsx](<file://apps/portal/app/(departments)/training/certifications/page.tsx>)
- [training-overview-page.tsx](<file://apps/portal/app/(departments)/training/page.tsx>)

## Core Components

- Training department scope: LMS, certifications, competency tracking, and reports
- Certifications table: stores active certifications with expiry dates
- Expiration monitoring: queries to surface renewals due within a defined window (e.g., 30 days)
- Dashboard KPIs: active courses, compliance rate, pending assessments, expiring certifications
- Audit trail: central audit logs capturing insert/update/delete actions with actor and context

Key implementation anchors:

- Data model references and expiry query pattern are documented in the training entity docs
- The database schema docs describe RLS patterns, audit logs, and core tables
- The certifications page provides filtering and status visualization for Active, Expiring Soon, and Expired states

**Section sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)
- [certifications-page.tsx](<file://apps/portal/app/(departments)/training/certifications/page.tsx>)

## Architecture Overview

The certification tracking system integrates portal UI components with database-backed records and audit mechanisms. The UI surfaces certification status and supports filtering by search terms and status. The backend relies on PostgreSQL with Row Level Security (RLS) policies scoped by department and maintains an audit trail for change history.

```mermaid
sequenceDiagram
participant User as "User"
participant Portal as "Certifications Page"
participant DB as "PostgreSQL (Supabase)"
participant Audit as "Audit Logs"
User->>Portal : Open /training/certifications
Portal->>DB : Query certifications (filter by q/status)
DB-->>Portal : List of certifications with status
Portal->>Portal : Compute counts (Active/Expiring Soon/Expired)
User->>Portal : Apply search or filter
Portal->>DB : Re-query with updated filters
DB-->>Portal : Filtered results
Note over Portal,DB : Status computed from expires_at vs current time<br/>and business rules
```

**Diagram sources**

- [certifications-page.tsx](<file://apps/portal/app/(departments)/training/certifications/page.tsx>)
- [database-schema.md](file://wiki/concepts/database-schema.md)

## Detailed Component Analysis

### Data Model and Relationships

The training domain centers around employees, certifications, training records, and course catalog entries. The certifications table captures issued and expired dates per employee and cert type. The audit_logs table records all changes with actor identity and department scoping.

```mermaid
erDiagram
EMPLOYEES {
uuid id PK
uuid auth_id
uuid department_id
text full_name
text role
uuid[] accessible_departments
}
CERTIFICATIONS {
uuid id PK
uuid employee_id FK
text cert_type
timestamptz issued_at
timestamptz expires_at
}
TRAINING_RECORDS {
uuid id PK
uuid employee_id FK
uuid course_id FK
timestamptz completed_at
numeric score
}
TRAINING_COURSES {
uuid id PK
text name
uuid department_id FK
numeric duration_hours
text required_role
}
AUDIT_LOGS {
uuid id PK
text action
text table_name
uuid record_id
jsonb old_data
jsonb new_data
uuid performed_by
uuid department_id
inet ip_address
text user_agent
timestamptz created_at
}
EMPLOYEES ||--o{ CERTIFICATIONS : "has"
EMPLOYEES ||--o{ TRAINING_RECORDS : "completes"
TRAINING_COURSES ||--o{ TRAINING_RECORDS : "enables"
DEPARTMENTS ||--o{ EMPLOYEES : "belongs_to"
DEPARTMENTS ||--o{ TRAINING_COURSES : "owns"
DEPARTMENTS ||--o{ AUDIT_LOGS : "scoped_by"
```

Notes:

- The certifications table fields align with the documented schema description for training entity
- Audit logs capture insert/update/delete events with JSONB snapshots and actor metadata
- RLS policies restrict access based on department membership and roles

**Diagram sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

**Section sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

### Issuance Workflow

Issuing a certification involves creating a record in the certifications table with employee linkage, cert type, issue date, and expiry date. The process should be audited via audit_logs and enforced by RLS policies tied to department membership.

```mermaid
flowchart TD
Start(["Start Issuance"]) --> Validate["Validate Employee and Role Requirements"]
Validate --> CheckEligibility{"Meets Requirements?"}
CheckEligibility --> |No| Deny["Deny Issuance"]
CheckEligibility --> |Yes| CreateCert["Create Certification Record"]
CreateCert --> SetDates["Set issued_at and expires_at"]
SetDates --> Audit["Record Audit Entry"]
Audit --> Notify["Notify Stakeholders (if configured)"]
Notify --> End(["End"])
Deny --> End
```

Implementation anchors:

- Validation rules can reference required roles and course completions from training_records and training_courses
- Audit entry creation leverages the audit_logs structure described in the schema docs

**Diagram sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

**Section sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

### Completion Tracking

Completion tracking associates employees with training records upon course completion, optionally scoring outcomes. This feeds into compliance calculations and informs eligibility for certifications.

```mermaid
sequenceDiagram
participant Trainer as "Trainer"
participant Portal as "Training Records UI"
participant DB as "PostgreSQL"
participant Audit as "Audit Logs"
Trainer->>Portal : Submit completion (employee, course, score)
Portal->>DB : Insert training_record
DB-->>Portal : Success
Portal->>Audit : Log insert event
Audit-->>Portal : Acknowledged
```

**Diagram sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

**Section sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

### Expiration Monitoring and Automated Alerts

Expiration monitoring uses queries against the certifications table to identify records nearing expiry. The documented approach surfaces certifications where expires_at falls within a threshold window (e.g., 30 days).

```mermaid
flowchart TD
Run(["Scheduled Job"]) --> Query["Query certifications where expires_at < NOW() + INTERVAL '30 days'"]
Query --> Results{"Any near-expiry?"}
Results --> |Yes| Alert["Send alerts to managers/trainers"]
Results --> |No| Done(["Done"])
Alert --> Done
```

**Diagram sources**

- [training-department.md](file://wiki/entities/training-department.md)

**Section sources**

- [training-department.md](file://wiki/entities/training-department.md)

### Renewal Process

Renewal involves issuing a new certification record after retraining or reassessment. The workflow mirrors issuance but may include checks for prior expiry and mandatory refresher courses.

```mermaid
sequenceDiagram
participant Admin as "Admin/Trainer"
participant Portal as "Renewal UI"
participant DB as "PostgreSQL"
participant Audit as "Audit Logs"
Admin->>Portal : Initiate renewal for employee and cert_type
Portal->>DB : Verify prior expiry and prerequisites
DB-->>Portal : Eligibility confirmed
Portal->>DB : Insert new certification (issued_at = now, expires_at = future)
Portal->>Audit : Log update/insert events
Audit-->>Portal : Acknowledged
```

**Diagram sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

**Section sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

### Compliance Reporting

Compliance reporting aggregates certification status across departments and roles. Key metrics include compliance rate and counts of expiring certifications. The training dashboard KPIs provide a foundation for these reports.

```mermaid
classDiagram
class ComplianceReport {
+compute_compliance_rate() number
+list_expiring_soon() list
+export_csv() void
}
class CertificationsTable {
+query_active() list
+query_expiring_soon() list
+query_expired() list
}
class AuditLogs {
+get_changes(table_name, record_id) list
}
ComplianceReport --> CertificationsTable : "reads"
ComplianceReport --> AuditLogs : "audits"
```

**Diagram sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

**Section sources**

- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)

### UI Components and Filtering

The certifications page implements client-side filtering by search term and status, rendering status badges for Active, Expiring Soon, and Expired. The training overview page highlights recent certifications and their statuses.

```mermaid
flowchart TD
Load(["Load Certifications Page"]) --> Fetch["Fetch initial dataset"]
Fetch --> Render["Render table with status badges"]
UserInput["User enters search or selects status"] --> Filter["Filter dataset locally"]
Filter --> Update["Update UI with filtered rows"]
Update --> Render
```

**Diagram sources**

- [certifications-page.tsx](<file://apps/portal/app/(departments)/training/certifications/page.tsx>)
- [training-overview-page.tsx](<file://apps/portal/app/(departments)/training/page.tsx>)

**Section sources**

- [certifications-page.tsx](<file://apps/portal/app/(departments)/training/certifications/page.tsx>)
- [training-overview-page.tsx](<file://apps/portal/app/(departments)/training/page.tsx>)

### Integration with Employee Records

Employees are linked to certifications through foreign keys and accessed via RLS policies. The employees table defines role and department membership, which govern access and eligibility for certifications.

```mermaid
sequenceDiagram
participant Admin as "Admin"
participant Portal as "Employee Management"
participant DB as "PostgreSQL"
participant RLS as "RLS Policies"
Admin->>Portal : Assign certification to employee
Portal->>DB : Insert certification with employee_id
DB->>RLS : Enforce department-based access
RLS-->>DB : Allow/Deny based on policy
DB-->>Portal : Persist record if allowed
```

**Diagram sources**

- [database-schema.md](file://wiki/concepts/database-schema.md)

**Section sources**

- [database-schema.md](file://wiki/concepts/database-schema.md)

### Audit Trails and Regulatory Compliance

Audit logs capture insert/update/delete operations with actor identity, IP address, and user agent. This supports traceability and compliance audits. Generated columns and enum types improve data integrity and performance.

```mermaid
flowchart TD
Change(["Data Change"]) --> Capture["Capture old/new JSONB snapshots"]
Capture --> Actor["Attach performed_by and department_id"]
Actor --> Store["Insert into audit_logs"]
Store --> Report["Enable compliance reporting and forensics"]
```

**Diagram sources**

- [database-schema.md](file://wiki/concepts/database-schema.md)
- [016_schema_enhancements.sql](file://packages/supabase/migrations/016_schema_enhancements.sql)

**Section sources**

- [database-schema.md](file://wiki/concepts/database-schema.md)
- [016_schema_enhancements.sql](file://packages/supabase/migrations/016_schema_enhancements.sql)

## Dependency Analysis

The certification tracking feature depends on:

- Portal UI pages for listing and filtering certifications
- Database schema definitions for certifications, training records, and audit logs
- RLS policies and employee records for access control
- Migration enhancements for enums, audit columns, and generated columns

```mermaid
graph TB
CertPage["Certifications Page"] --> TrainingDocs["Training Dept Docs"]
TrainingDocs --> DBSchema["Database Schema Docs"]
DBSchema --> Migrations["Schema Enhancements Migration"]
CertPage --> DBSchema
```

**Diagram sources**

- [certifications-page.tsx](<file://apps/portal/app/(departments)/training/certifications/page.tsx>)
- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)
- [016_schema_enhancements.sql](file://packages/supabase/migrations/016_schema_enhancements.sql)

**Section sources**

- [certifications-page.tsx](<file://apps/portal/app/(departments)/training/certifications/page.tsx>)
- [training-department.md](file://wiki/entities/training-department.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)
- [016_schema_enhancements.sql](file://packages/supabase/migrations/016_schema_enhancements.sql)

## Performance Considerations

- Use indexes on frequently queried columns such as employee_id, cert_type, and expires_at to optimize filtering and expiration queries
- Leverage materialized views for heavy aggregation when generating compliance reports
- Partition time-series data if certification records grow significantly over time
- Cache near-expiry lists for scheduled jobs to reduce repeated scans

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

Common issues and resolutions:

- Missing certifications in filtered results: verify search parameters and status filters; ensure expires_at values are correctly set
- Access denied when assigning certifications: confirm employee’s department membership and RLS policy alignment
- Audit log gaps: check trigger configurations and permissions for audit_logs inserts
- Expiration alerts not firing: validate scheduled job execution and query thresholds

**Section sources**

- [certifications-page.tsx](<file://apps/portal/app/(departments)/training/certifications/page.tsx>)
- [database-schema.md](file://wiki/concepts/database-schema.md)

## Conclusion

The certification tracking system integrates portal UI, robust database schemas, and comprehensive audit capabilities to support issuance, completion tracking, expiration monitoring, and compliance reporting. With clear data models, RLS-enforced access, and audit trails, the system provides a solid foundation for regulatory compliance and operational efficiency.

[No sources needed since this section summarizes without analyzing specific files]
