# Inspection Management System

<cite>
**Referenced Files in This Document**
- [safety-department.md](file://wiki/entities/safety-department.md)
- [department-features.md](file://wiki/concepts/department-features.md)
- [database-schema.md](file://wiki/concepts/database-schema.md)
- [SCHEMA.md](file://wiki/SCHEMA.md)
- [006_safety_department.sql (packages/supabase)](file://packages/supabase/migrations/006_safety_department.sql)
- [006_safety_department.sql (packages/database)](file://packages/database/migrations/006_safety_department.sql)
- [control-room.service.ts](file://apps/api/src/control-room/control-room.service.ts)
- [shift-completeness.ts](file://apps/portal/lib/shift-completeness.ts)
- [schedules/page.tsx](file://apps/portal/app/(departments)/training/schedules/page.tsx)
- [schemas.ts](file://apps/api/src/ai/schemas.ts)
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

This document describes the Safety Inspection Management system as implemented within the repository. It focuses on:

- Inspection scheduling and planning
- Checklist management and field inspection workflows
- Recording inspection results, non-conformance tracking, and corrective action assignment
- Analytics, performance metrics, and trend analysis
- Inspector training integration and result validation processes

The system is centered around safety incident reporting, severity categorization, and investigation workflows, with supporting analytics and auditability. Training schedules are available to support inspector readiness and compliance.

## Project Structure

The relevant parts of the codebase include:

- Safety department entity documentation and feature overview
- Database schema definitions for safety tables and reference data
- API service logic for shift completeness and form coverage
- Portal UI components for training schedules and search/filtering
- AI schemas for risk assessment and compliance scoring

```mermaid
graph TB
subgraph "Documentation"
A["Safety Department Entity<br/>wiki/entities/safety-department.md"]
B["Department Features<br/>wiki/concepts/department-features.md"]
C["Database Schema Concepts<br/>wiki/concepts/database-schema.md"]
D["Schema Reference<br/>wiki/SCHEMA.md"]
end
subgraph "Data Layer"
E["Safety Migrations (Supabase)<br/>packages/supabase/migrations/006_safety_department.sql"]
F["Safety Migrations (Database)<br/>packages/database/migrations/006_safety_department.sql"]
end
subgraph "API Layer"
G["Control Room Service<br/>apps/api/src/control-room/control-room.service.ts"]
H["AI Schemas<br/>apps/api/src/ai/schemas.ts"]
end
subgraph "Portal UI"
I["Training Schedules Page<br/>apps/portal/app/(departments)/training/schedules/page.tsx"]
J["Shift Completeness Logic<br/>apps/portal/lib/shift-completeness.ts"]
end
A --> C
B --> C
C --> E
C --> F
G --> J
I --> J
H --> G
```

**Diagram sources**

- [safety-department.md:1-76](file://wiki/entities/safety-department.md#L1-L76)
- [department-features.md:83-104](file://wiki/concepts/department-features.md#L83-L104)
- [database-schema.md:180-338](file://wiki/concepts/database-schema.md#L180-L338)
- [SCHEMA.md:312-335](file://wiki/SCHEMA.md#L312-L335)
- [006_safety_department.sql (packages/supabase):1-46](file://packages/supabase/migrations/006_safety_department.sql#L1-L46)
- [006_safety_department.sql (packages/database):1-46](file://packages/database/migrations/006_safety_department.sql#L1-L46)
- [control-room.service.ts:40-157](file://apps/api/src/control-room/control-room.service.ts#L40-L157)
- [shift-completeness.ts:215-269](file://apps/portal/lib/shift-completeness.ts#L215-L269)
- [schedules/page.tsx](<file://apps/portal/app/(departments)/training/schedules/page.tsx#L1-L234>)
- [schemas.ts:1-19](file://apps/api/src/ai/schemas.ts#L1-L19)

**Section sources**

- [safety-department.md:1-76](file://wiki/entities/safety-department.md#L1-L76)
- [department-features.md:83-104](file://wiki/concepts/department-features.md#L83-L104)
- [database-schema.md:180-338](file://wiki/concepts/database-schema.md#L180-L338)
- [SCHEMA.md:312-335](file://wiki/SCHEMA.md#L312-L335)

## Core Components

- Safety Incident Workflow
  - Statuses: open, under-investigation, resolved, closed
  - Severity levels: low, medium, high, critical (with weights)
  - Categories: Slip/Trip/Fall, Equipment Contact, Vehicle Incident, Hazardous Material, Environmental, Near Miss, Other
  - Key fields include incident type, location, injured parties, root cause, corrective action, and timestamps

- Data Model Foundations
  - safety_incidents table with references to severities and categories
  - safety_severities and safety_incident_categories reference tables
  - Audit logs and RLS policies for security and traceability

- Shift Coverage and Form Completion
  - Control room service computes required forms per machine type and determines coverage
  - Client-side logic resolves hasEntry and hoursWorked per machine/form mapping

- Training Scheduling
  - Training sessions page supports filtering by type and search across course/instructor/location
  - Provides registration capacity and status indicators

- AI-Assisted Risk and Compliance
  - Zod schemas define structured outputs for risk assessments and compliance results

**Section sources**

- [department-features.md:83-104](file://wiki/concepts/department-features.md#L83-L104)
- [database-schema.md:180-338](file://wiki/concepts/database-schema.md#L180-L338)
- [SCHEMA.md:312-335](file://wiki/SCHEMA.md#L312-L335)
- [006_safety_department.sql (packages/supabase):119-142](file://packages/supabase/migrations/006_safety_department.sql#L119-L142)
- [006_safety_department.sql (packages/database):119-142](file://packages/database/migrations/006_safety_department.sql#L119-L142)
- [control-room.service.ts:40-157](file://apps/api/src/control-room/control-room.service.ts#L40-L157)
- [shift-completeness.ts:215-269](file://apps/portal/lib/shift-completeness.ts#L215-L269)
- [schedules/page.tsx](<file://apps/portal/app/(departments)/training/schedules/page.tsx#L1-L234>)
- [schemas.ts:1-19](file://apps/api/src/ai/schemas.ts#L1-L19)

## Architecture Overview

The system integrates documentation-driven design, database migrations, API services, and portal UI to support safety inspections and related workflows.

```mermaid
sequenceDiagram
participant User as "Inspector/User"
participant Portal as "Portal UI<br/>training/schedules/page.tsx"
participant Logic as "Shift Completeness<br/>shift-completeness.ts"
participant API as "Control Room Service<br/>control-room.service.ts"
participant DB as "Safety Tables<br/>migrations/006_safety_department.sql"
participant AI as "AI Schemas<br/>ai/schemas.ts"
User->>Portal : Open training schedules and filter/search
Portal->>Logic : Resolve filters and display sessions
User->>API : Request shift completeness for a department/date/shift
API->>DB : Query machines and required forms
API-->>User : Return coverage statuses and gaps
User->>DB : Record safety incident or update status
API->>AI : Validate structured outputs (risk/compliance)
AI-->>API : Validated payload
API-->>User : Confirmation and next steps
```

**Diagram sources**

- [schedules/page.tsx](<file://apps/portal/app/(departments)/training/schedules/page.tsx#L1-L234>)
- [shift-completeness.ts:215-269](file://apps/portal/lib/shift-completeness.ts#L215-L269)
- [control-room.service.ts:40-157](file://apps/api/src/control-room/control-room.service.ts#L40-L157)
- [006_safety_department.sql (packages/supabase):1-46](file://packages/supabase/migrations/006_safety_department.sql#L1-L46)
- [schemas.ts:1-19](file://apps/api/src/ai/schemas.ts#L1-L19)

## Detailed Component Analysis

### Safety Incident Workflow and Data Model

- Incident lifecycle states and severity weighting drive prioritization and reporting
- Categories standardize classification for trend analysis and dashboards
- Audit logs capture changes for accountability and compliance

```mermaid
flowchart TD
Start(["Incident Reported"]) --> Classify["Classify Type and Category"]
Classify --> AssignSeverity["Assign Severity Level"]
AssignSeverity --> Investigate{"Status = open?"}
Investigate --> |Yes| RootCause["Perform Root Cause Analysis"]
RootCause --> CorrectiveAction["Define Corrective Action"]
CorrectiveAction --> Resolve["Set Status = resolved"]
Investigate --> |No| Review["Review Existing Findings"]
Review --> Close["Set Status = closed"]
Resolve --> Close
Close --> End(["Closed"])
```

**Diagram sources**

- [department-features.md:94-104](file://wiki/concepts/department-features.md#L94-L104)
- [database-schema.md:180-207](file://wiki/concepts/database-schema.md#L180-L207)
- [SCHEMA.md:312-335](file://wiki/SCHEMA.md#L312-L335)

**Section sources**

- [department-features.md:83-104](file://wiki/concepts/department-features.md#L83-L104)
- [database-schema.md:180-207](file://wiki/concepts/database-schema.md#L180-L207)
- [SCHEMA.md:312-335](file://wiki/SCHEMA.md#L312-L335)

### Inspection Planning and Scheduling Integration

- Training schedules provide visibility into mandatory and refresher courses
- Filtering and search enable quick discovery of relevant sessions
- Capacity and status indicators help plan inspector availability

```mermaid
classDiagram
class Schedule {
+number id
+string course
+string location
+string date
+string time
+string instructor
+string capacity
+number filled
+string type
+string status
}
class FilterTabs {
+string paramName
+string[] options
+string currentValue
}
class SearchForm {
+string value
+string placeholder
+object hiddenParams
}
Schedule <.. FilterTabs : "filtered by type"
Schedule <.. SearchForm : "searched by q"
```

**Diagram sources**

- [schedules/page.tsx](<file://apps/portal/app/(departments)/training/schedules/page.tsx#L1-L234>)

**Section sources**

- [schedules/page.tsx](<file://apps/portal/app/(departments)/training/schedules/page.tsx#L1-L234>)

### Field Inspection Workflows and Shift Coverage

- Required forms per machine type determine coverage expectations
- Client-side logic maps machine types to forms and resolves completion status
- Hours worked can be surfaced where applicable

```mermaid
flowchart TD
Entry(["Load Machines"]) --> MapType["Map Machine Type to Required Form"]
MapType --> CheckEntry{"Has Entry for Machine?"}
CheckEntry --> |Yes| MarkCovered["Mark Covered"]
CheckEntry --> |No| MarkGap["Mark Gap"]
MarkCovered --> ComputeHours["Compute Hours Worked (if applicable)"]
MarkGap --> ComputeHours
ComputeHours --> Output(["Coverage Report"])
```

**Diagram sources**

- [control-room.service.ts:40-157](file://apps/api/src/control-room/control-room.service.ts#L40-L157)
- [shift-completeness.ts:215-269](file://apps/portal/lib/shift-completeness.ts#L215-L269)

**Section sources**

- [control-room.service.ts:40-157](file://apps/api/src/control-room/control-room.service.ts#L40-L157)
- [shift-completeness.ts:215-269](file://apps/portal/lib/shift-completeness.ts#L215-L269)

### Non-Conformance Tracking and Corrective Actions

- Non-conformances are captured via incident records with category and severity
- Root cause and corrective action fields support structured remediation
- Status progression ensures closure and auditability

```mermaid
sequenceDiagram
participant Inspector as "Inspector"
participant DB as "safety_incidents"
participant Admin as "Reviewer/Admin"
Inspector->>DB : Create incident (type, category, severity)
DB-->>Inspector : Incident created
Admin->>DB : Update root_cause and corrective_action
Admin->>DB : Set status = resolved/closed
DB-->>Admin : Updated record
```

**Diagram sources**

- [database-schema.md:180-207](file://wiki/concepts/database-schema.md#L180-L207)
- [SCHEMA.md:312-335](file://wiki/SCHEMA.md#L312-L335)

**Section sources**

- [database-schema.md:180-207](file://wiki/concepts/database-schema.md#L180-L207)
- [SCHEMA.md:312-335](file://wiki/SCHEMA.md#L312-L335)

### Inspection Result Validation and AI Assistance

- Structured schemas validate risk assessments and compliance results
- Enforcement of enums and numeric ranges ensures consistency

```mermaid
classDiagram
class RiskAssessment {
+enum risk
+string[] actions
+string timeEstimate
+string summary
}
class ComplianceResult {
+string[] violations
+string[] concerns
+number score
+string summary
}
```

**Diagram sources**

- [schemas.ts:1-19](file://apps/api/src/ai/schemas.ts#L1-L19)

**Section sources**

- [schemas.ts:1-19](file://apps/api/src/ai/schemas.ts#L1-L19)

### Analytics, Performance Metrics, and Trend Analysis

- Dashboard KPIs include LTI-free days, incident-free days, open incidents, and lost-time counts
- Reference tables and categories enable distribution charts and trend analysis
- Audit logs support change tracking and compliance reporting

```mermaid
graph TB
KPI["Dashboard KPIs<br/>LTI-Free Days, Open Incidents, Lost-Time"] --> Charts["Charts & Trends<br/>Severity Distribution, Categories"]
Charts --> Reports["Compliance Reports"]
Reports --> Audit["Audit Logs<br/>Change Tracking"]
```

**Diagram sources**

- [safety-department.md:36-64](file://wiki/entities/safety-department.md#L36-L64)
- [department-features.md:83-104](file://wiki/concepts/department-features.md#L83-L104)
- [database-schema.md:208-229](file://wiki/concepts/database-schema.md#L208-L229)

**Section sources**

- [safety-department.md:36-64](file://wiki/entities/safety-department.md#L36-L64)
- [department-features.md:83-104](file://wiki/concepts/department-features.md#L83-L104)
- [database-schema.md:208-229](file://wiki/concepts/database-schema.md#L208-L229)

## Dependency Analysis

- Documentation drives implementation: entity and concept docs inform schema and features
- Migrations implement safety tables and seed reference data
- API service depends on machine type mappings and form metadata to compute coverage
- Portal UI depends on client-side logic for filtering and coverage resolution
- AI schemas enforce structured outputs used by downstream processes

```mermaid
graph LR
Docs["Entity & Concept Docs"] --> Schema["Migrations & Schema"]
Schema --> API["Control Room Service"]
API --> PortalUI["Portal UI"]
PortalUI --> ClientLogic["Shift Completeness Logic"]
ClientLogic --> API
AI["AI Schemas"] --> API
```

**Diagram sources**

- [safety-department.md:1-76](file://wiki/entities/safety-department.md#L1-L76)
- [department-features.md:83-104](file://wiki/concepts/department-features.md#L83-L104)
- [006_safety_department.sql (packages/supabase):1-46](file://packages/supabase/migrations/006_safety_department.sql#L1-L46)
- [control-room.service.ts:40-157](file://apps/api/src/control-room/control-room.service.ts#L40-L157)
- [shift-completeness.ts:215-269](file://apps/portal/lib/shift-completeness.ts#L215-L269)
- [schemas.ts:1-19](file://apps/api/src/ai/schemas.ts#L1-L19)

**Section sources**

- [safety-department.md:1-76](file://wiki/entities/safety-department.md#L1-L76)
- [department-features.md:83-104](file://wiki/concepts/department-features.md#L83-L104)
- [006_safety_department.sql (packages/supabase):1-46](file://packages/supabase/migrations/006_safety_department.sql#L1-L46)
- [control-room.service.ts:40-157](file://apps/api/src/control-room/control-room.service.ts#L40-L157)
- [shift-completeness.ts:215-269](file://apps/portal/lib/shift-completeness.ts#L215-L269)
- [schemas.ts:1-19](file://apps/api/src/ai/schemas.ts#L1-L19)

## Performance Considerations

- Use materialized views and indexes for dashboard queries and trend analysis
- Cache shift completeness computations to reduce repeated database load
- Partition time-series tables to improve query performance at scale
- Ensure RLS policies are optimized with appropriate indexes on department membership columns

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

- Missing required forms: Verify machine type mapping and required form metadata; check coverage report for gaps
- Incorrect incident status transitions: Confirm workflow rules and ensure root cause and corrective action are populated before closing
- Training schedule filters not applying: Validate search parameters and filter tab state; confirm hidden params propagation
- AI schema validation failures: Ensure payloads conform to defined enums and numeric ranges

**Section sources**

- [control-room.service.ts:40-157](file://apps/api/src/control-room/control-room.service.ts#L40-L157)
- [shift-completeness.ts:215-269](file://apps/portal/lib/shift-completeness.ts#L215-L269)
- [schedules/page.tsx](<file://apps/portal/app/(departments)/training/schedules/page.tsx#L1-L234>)
- [schemas.ts:1-19](file://apps/api/src/ai/schemas.ts#L1-L19)

## Conclusion

The Safety Inspection Management system integrates robust data modeling, clear workflows, and supportive UI components to manage inspections, track non-conformances, and drive corrective actions. Training schedules enhance inspector readiness, while analytics and audit capabilities support continuous improvement and compliance.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

- Safety Incident Fields and References
  - Refer to the safety tables and reference data for detailed column definitions and constraints
- Shift Coverage Mapping
  - See control room service and client-side logic for machine-to-form mappings and coverage computation

**Section sources**

- [database-schema.md:180-338](file://wiki/concepts/database-schema.md#L180-L338)
- [SCHEMA.md:312-335](file://wiki/SCHEMA.md#L312-L335)
- [control-room.service.ts:40-157](file://apps/api/src/control-room/control-room.service.ts#L40-L157)
- [shift-completeness.ts:215-269](file://apps/portal/lib/shift-completeness.ts#L215-L269)
