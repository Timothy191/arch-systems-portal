# Maintenance Scheduling

<cite>
**Referenced Files in This Document**
- [025_machine_telemetry.sql](file://packages/supabase/migrations/025_machine_telemetry.sql)
- [035_fleet_and_equipment_tables.sql](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql)
- [053_machine_telemetry_webhook.sql](file://packages/supabase/migrations/053_machine_telemetry_webhook.sql)
- [telemetry.service.ts](file://apps/api/src/telemetry/telemetry.service.ts)
- [main.rs](file://apps/portal/plugins/rust-telemetry-engine/src/main.rs)
- [engineering-department.md](file://wiki/entities/engineering-department.md)
</cite>

## Table of Contents

1. Introduction
2. Project Structure
3. Core Components
4. Architecture Overview
5. Detailed Component Analysis
6. Dependency Analysis
7. Performance Considerations
8. Troubleshooting Guide
9. Conclusion
10. Appendices

## Introduction

This document describes the Maintenance Scheduling system as implemented in the repository. It covers:

- Preventive maintenance planning using equipment and fleet service dates
- Corrective maintenance workflows via breakdowns book-in/book-out
- Predictive maintenance algorithms driven by machine telemetry
- Maintenance calendar management, technician assignment, and resource allocation
- Examples of task creation, scheduling rules, and automated reminders
- Maintenance history tracking, cost analysis, and compliance reporting
- Integration with equipment telemetry for condition-based triggers

The system combines database-backed asset registries, a real-time telemetry pipeline, and predictive analytics to enable proactive maintenance operations.

## Project Structure

The maintenance-related capabilities are primarily implemented across:

- Database schema and functions for telemetry, archival, and summaries
- A webhook-triggered ingestion pipeline that forwards telemetry to SCADA and caches last values
- A predictive analytics engine (Rust binary or JS fallback) computing wear, failure probability, and remaining useful life
- Documentation of the Engineering department’s corrective workflow and KPIs

```mermaid
graph TB
subgraph "Database"
T["machine_telemetry"]
TA["machine_telemetry_archive"]
F["fleet"]
E["equipment"]
B["breakdowns"]
end
subgraph "API Service"
TS["TelemetryService<br/>processWebhookPayload / processDirectTelemetry"]
end
subgraph "SCADA"
FX["FUXA Tag API"]
end
subgraph "Analytics"
RS["Rust Telemetry Engine"]
end
T --> |"pg_net HTTP POST"| TS
TS --> FX
TS --> RS
F --> |"next_service_date"| TS
E --> |"calibration_expiry"| TS
B --> |"book-in/out"| TS
```

**Diagram sources**

- [025_machine_telemetry.sql:1-313](file://packages/supabase/migrations/025_machine_telemetry.sql#L1-L313)
- [035_fleet_and_equipment_tables.sql:1-120](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L1-L120)
- [053_machine_telemetry_webhook.sql:1-45](file://packages/supabase/migrations/053_machine_telemetry_webhook.sql#L1-L45)
- [telemetry.service.ts:1-195](file://apps/api/src/telemetry/telemetry.service.ts#L1-L195)
- [main.rs:1-69](file://apps/portal/plugins/rust-telemetry-engine/src/main.rs#L1-L69)

**Section sources**

- [025_machine_telemetry.sql:1-313](file://packages/supabase/migrations/025_machine_telemetry.sql#L1-L313)
- [035_fleet_and_equipment_tables.sql:1-120](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L1-L120)
- [053_machine_telemetry_webhook.sql:1-45](file://packages/supabase/migrations/053_machine_telemetry_webhook.sql#L1-L45)
- [telemetry.service.ts:1-195](file://apps/api/src/telemetry/telemetry.service.ts#L1-L195)
- [main.rs:1-69](file://apps/portal/plugins/rust-telemetry-engine/src/main.rs#L1-L69)
- [engineering-department.md:1-69](file://wiki/entities/engineering-department.md#L1-L69)

## Core Components

- Asset registry and preventive maintenance fields
  - Fleet assets include last_service_date and next_service_date to schedule preventive tasks
  - Equipment includes calibration_expiry for scheduled calibrations
- Corrective maintenance workflow
  - Breakdowns table supports book-in/book-out with status tracking and audit fields
- Telemetry ingestion and caching
  - Webhook from database inserts triggers processing, deduplication, and forwarding to SCADA
- Predictive maintenance engine
  - Rust binary computes wear index, failure probability, and remaining useful life; JS fallback available
- Historical aggregation and archival
  - Monthly archival function aggregates daily metrics and moves data to archive table
  - Summary function provides hourly/daily aggregations for dashboards

**Section sources**

- [035_fleet_and_equipment_tables.sql:1-120](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L1-L120)
- [025_machine_telemetry.sql:150-223](file://packages/supabase/migrations/025_machine_telemetry.sql#L150-L223)
- [telemetry.service.ts:49-159](file://apps/api/src/telemetry/telemetry.service.ts#L49-L159)
- [main.rs:27-68](file://apps/portal/plugins/rust-telemetry-engine/src/main.rs#L27-L68)
- [engineering-department.md:25-44](file://wiki/entities/engineering-department.md#L25-L44)

## Architecture Overview

The system integrates database events, an API service, SCADA, and analytics to drive maintenance scheduling and alerts.

```mermaid
sequenceDiagram
participant DB as "Postgres (Supabase)"
participant Trigger as "pg_net Webhook"
participant API as "TelemetryService"
participant Cache as "Redis + Local Map"
participant SCADA as "FUXA Tag API"
participant Analytics as "Rust Telemetry Engine"
DB->>Trigger : INSERT machine_telemetry
Trigger->>API : HTTP POST payload {table, record}
API->>Cache : Check L1/L2 last value
alt Value unchanged
API-->>DB : Acknowledge (cached)
else New value
API->>SCADA : POST tag update
API->>Analytics : computeRustTelemetry(hours,temp,rpm)
Analytics-->>API : {wearIndex, probability, rulHours, status}
API-->>DB : Persist results (via downstream logic)
end
```

**Diagram sources**

- [053_machine_telemetry_webhook.sql:1-45](file://packages/supabase/migrations/053_machine_telemetry_webhook.sql#L1-L45)
- [telemetry.service.ts:49-159](file://apps/api/src/telemetry/telemetry.service.ts#L49-L159)
- [main.rs:27-68](file://apps/portal/plugins/rust-telemetry-engine/src/main.rs#L27-L68)

## Detailed Component Analysis

### Preventive Maintenance Planning

- Fleet assets track last_service_date and next_service_date to plan recurring services
- Equipment tracks calibration_expiry for scheduled calibrations
- Calendar management can be built on these date fields to generate upcoming tasks and reminders

Examples:

- Task creation: Create a preventive task when next_service_date is approaching
- Scheduling rules: Generate tasks at fixed intervals based on operating hours or calendar thresholds
- Automated reminders: Notify technicians before due dates

**Section sources**

- [035_fleet_and_equipment_tables.sql:6-20](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L6-L20)
- [035_fleet_and_equipment_tables.sql:25-38](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L25-L38)

### Corrective Maintenance Workflows

- Breakdowns support book-in/book-out with status transitions and audit fields
- Dashboard KPIs include active breakdowns, MTTR, pending work, and completed today

Workflow:

- Book-in: Record date/time, asset, and reason
- Investigation: Add repair notes during diagnosis
- Book-out: Set completion date/time and mark status completed
- Audit: Track created_by and completed_by

**Section sources**

- [engineering-department.md:25-44](file://wiki/entities/engineering-department.md#L25-L44)

### Predictive Maintenance Algorithms

- Inputs: operating hours, temperature, RPM
- Outputs: wear index, failure probability percentage, remaining useful life (hours), health classification
- Implementation: Rust binary invoked by API; JS fallback if binary unavailable

```mermaid
flowchart TD
Start(["Inputs: hours, temp, rpm"]) --> ComputeBase["Compute base fatigue from hours"]
ComputeBase --> Thermal["Compute thermal stress above threshold"]
Thermal --> Kinetic["Compute kinetic stress from RPM"]
Kinetic --> Wear["Aggregate cumulative wear index"]
Wear --> Prob["Sigmoid logistic regression to failure probability"]
Prob --> RUL["Project remaining useful life (hours)"]
RUL --> Classify{"Classify status"}
Classify --> |prob > 75%| Critical["critical"]
Classify --> |prob > 35%| Warning["warning"]
Classify --> |otherwise| Optimal["optimal"]
Critical --> End(["Outputs: wearIndex, probability, rulHours, status"])
Warning --> End
Optimal --> End
```

**Diagram sources**

- [main.rs:27-68](file://apps/portal/plugins/rust-telemetry-engine/src/main.rs#L27-L68)
- [telemetry.service.ts:161-193](file://apps/api/src/telemetry/telemetry.service.ts#L161-L193)

**Section sources**

- [main.rs:1-69](file://apps/portal/plugins/rust-telemetry-engine/src/main.rs#L1-L69)
- [telemetry.service.ts:161-193](file://apps/api/src/telemetry/telemetry.service.ts#L161-L193)

### Telemetry Ingestion and Caching

- Webhook trigger posts new telemetry records to the API
- API performs two-level deduplication:
  - L1: In-process map keyed by tenant and tag name
  - L2: Redis cache with TTL
- On change, updates SCADA tags and persists last values

```mermaid
sequenceDiagram
participant DB as "Postgres"
participant Hook as "pg_net"
participant API as "TelemetryService"
participant L1 as "Local Map"
participant L2 as "Redis"
participant SCADA as "FUXA"
DB->>Hook : INSERT machine_telemetry
Hook->>API : POST {table, record}
API->>L1 : Check scoped key
alt Cached L1
API-->>DB : Return cached result
else Not cached L1
API->>L2 : Get last value
alt Cached L2
API->>L1 : Update local
API-->>DB : Return cached result
else Not cached L2
API->>SCADA : POST tag update
SCADA-->>API : OK
API->>L1 : Update local
API->>L2 : Set last value
API-->>DB : Return success
end
end
```

**Diagram sources**

- [053_machine_telemetry_webhook.sql:1-45](file://packages/supabase/migrations/053_machine_telemetry_webhook.sql#L1-L45)
- [telemetry.service.ts:49-159](file://apps/api/src/telemetry/telemetry.service.ts#L49-L159)

**Section sources**

- [053_machine_telemetry_webhook.sql:1-45](file://packages/supabase/migrations/053_machine_telemetry_webhook.sql#L1-L45)
- [telemetry.service.ts:49-159](file://apps/api/src/telemetry/telemetry.service.ts#L49-L159)

### Maintenance History Tracking and Reporting

- Monthly archival aggregates daily metrics and moves them to archive table
- Summary function returns hourly or daily aggregations for dashboards
- Breakdowns history supports MTTR and completion counts

```mermaid
flowchart TD
A["New month starts"] --> B["archive_telemetry_month()"]
B --> C["Insert aggregated daily rows into archive"]
C --> D["Return archived_count and machines_archived"]
D --> E["Delete previous month from active table"]
```

**Diagram sources**

- [025_machine_telemetry.sql:150-223](file://packages/supabase/migrations/025_machine_telemetry.sql#L150-L223)

**Section sources**

- [025_machine_telemetry.sql:150-223](file://packages/supabase/migrations/025_machine_telemetry.sql#L150-L223)
- [025_machine_telemetry.sql:230-292](file://packages/supabase/migrations/025_machine_telemetry.sql#L230-L292)
- [engineering-department.md:39-44](file://wiki/entities/engineering-department.md#L39-L44)

### Technician Assignment and Resource Allocation

- Equipment assigned_to references personnel for ownership and assignment
- Fleet and equipment tables include indexes for efficient lookup by department and assignee
- Access control policies restrict access by role and department

**Section sources**

- [035_fleet_and_equipment_tables.sql:25-38](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L25-L38)
- [035_fleet_and_equipment_tables.sql:50-56](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L50-L56)
- [035_fleet_and_equipment_tables.sql:64-120](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L64-L120)

### Compliance Reporting

- Row-level security policies enforce department-scoped access for telemetry and assets
- Breakdowns and telemetry provide auditable records for compliance reviews

**Section sources**

- [025_machine_telemetry.sql:98-148](file://packages/supabase/migrations/025_machine_telemetry.sql#L98-L148)
- [035_fleet_and_equipment_tables.sql:64-120](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L64-L120)

## Dependency Analysis

Key dependencies and interactions:

- Database triggers depend on pg_net extension to call API endpoints
- API depends on Redis for distributed caching and local map for performance
- API invokes Rust binary for analytics; falls back to JS implementation
- Assets reference departments and personnel for assignment and access control

```mermaid
graph LR
PG["Postgres"] --> PN["pg_net"]
PN --> API["TelemetryService"]
API --> REDIS["Redis"]
API --> FUXA["FUXA Tag API"]
API --> RUST["Rust Telemetry Engine"]
FLEET["fleet"] --> API
EQUIP["equipment"] --> API
BROK["breakdowns"] --> API
```

**Diagram sources**

- [053_machine_telemetry_webhook.sql:1-45](file://packages/supabase/migrations/053_machine_telemetry_webhook.sql#L1-L45)
- [telemetry.service.ts:1-195](file://apps/api/src/telemetry/telemetry.service.ts#L1-L195)
- [main.rs:1-69](file://apps/portal/plugins/rust-telemetry-engine/src/main.rs#L1-L69)
- [035_fleet_and_equipment_tables.sql:1-120](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L1-L120)

**Section sources**

- [053_machine_telemetry_webhook.sql:1-45](file://packages/supabase/migrations/053_machine_telemetry_webhook.sql#L1-L45)
- [telemetry.service.ts:1-195](file://apps/api/src/telemetry/telemetry.service.ts#L1-L195)
- [main.rs:1-69](file://apps/portal/plugins/rust-telemetry-engine/src/main.rs#L1-L69)
- [035_fleet_and_equipment_tables.sql:1-120](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L1-L120)

## Performance Considerations

- Deduplication reduces redundant SCADA writes and network overhead
- Local map and Redis caching minimize latency and external calls
- Monthly archival keeps active telemetry tables lean for faster queries
- Indexes on department_id, codes, and assignees improve lookup performance

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

Common issues and checks:

- Webhook not firing: Ensure pg_net extension is enabled and webhook endpoint configured
- Duplicate SCADA updates: Verify L1/L2 caching keys and TTL behavior
- Analytics failures: Confirm Rust binary path exists; otherwise JS fallback will run
- Access denied: Validate RLS policies and user roles per department

**Section sources**

- [053_machine_telemetry_webhook.sql:1-45](file://packages/supabase/migrations/053_machine_telemetry_webhook.sql#L1-L45)
- [telemetry.service.ts:161-193](file://apps/api/src/telemetry/telemetry.service.ts#L161-L193)
- [025_machine_telemetry.sql:98-148](file://packages/supabase/migrations/025_machine_telemetry.sql#L98-L148)

## Conclusion

The Maintenance Scheduling system leverages structured asset registries, robust telemetry ingestion, and predictive analytics to enable proactive maintenance. Preventive schedules derive from service and calibration dates, corrective workflows are tracked through breakdowns, and condition-based triggers arise from telemetry-driven risk assessments. Archival and summary functions support historical analysis and compliance reporting, while caching and indexing ensure performance at scale.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Data Models

```mermaid
erDiagram
DEPARTMENTS {
uuid id PK
text name
}
PERSONNEL {
uuid id PK
text name
}
FLEET {
uuid id PK
text fleet_code UK
text vehicle_type
text make
text model
integer year
uuid department_id FK
text status
date last_service_date
date next_service_date
}
EQUIPMENT {
uuid id PK
text equip_code UK
text equipment_type
text serial_number
text manufacturer
text model
uuid department_id FK
uuid assigned_to FK
text status
date calibration_expiry
}
MACHINE_TELEMETRY {
uuid id PK
uuid machine_id FK
uuid department_id FK
timestamptz recorded_at
numeric engine_rpm
numeric engine_temp
numeric hydraulic_pressure
numeric vibration_level
numeric fuel_level
numeric bit_depth
integer alert_count
text[] alert_codes
}
BREAKDOWNS {
uuid id PK
uuid fleet_id FK
text machine_name
text reason
text repair_notes
timestamptz date_in
timestamptz time_in
timestamptz date_out
timestamptz time_out
text status
uuid created_by
uuid completed_by
}
DEPARTMENTS ||--o{ FLEET : "owns"
DEPARTMENTS ||--o{ EQUIPMENT : "owns"
PERSONNEL ||--o{ EQUIPMENT : "assigned_to"
FLEET ||--o{ BREAKDOWNS : "reported_for"
```

**Diagram sources**

- [035_fleet_and_equipment_tables.sql:1-120](file://packages/supabase/migrations/035_fleet_and_equipment_tables.sql#L1-L120)
- [025_machine_telemetry.sql:1-97](file://packages/supabase/migrations/025_machine_telemetry.sql#L1-L97)
- [029_breakdowns_machine_name.sql:1-8](file://packages/supabase/migrations/029_breakdowns_machine_name.sql#L1-L8)
