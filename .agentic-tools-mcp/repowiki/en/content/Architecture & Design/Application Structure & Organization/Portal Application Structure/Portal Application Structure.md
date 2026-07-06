# Portal Application Structure

<cite>
**Referenced Files in This Document**
- [apps/portal/app/layout.tsx](file://apps/portal/app/layout.tsx)
- [apps/portal/app/(auth)/layout.tsx](file://apps/portal/app/(auth)/layout.tsx)
- [apps/portal/app/(hub)/layout.tsx](file://apps/portal/app/(hub)/layout.tsx)
- [apps/portal/app/(hub)/page.tsx](file://apps/portal/app/(hub)/page.tsx)
- [apps/portal/app/(departments)/[department]/layout.tsx](file://apps/portal/app/(departments)/[department]/layout.tsx)
- [apps/portal/app/(departments)/loading.tsx](file://apps/portal/app/(departments)/loading.tsx)
- [apps/portal/app/(departments)/access-control/page.tsx](file://apps/portal/app/(departments)/access-control/page.tsx)
- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)
- [apps/portal/features/hub/components/DepartmentCard.tsx](file://apps/portal/features/hub/components/DepartmentCard.tsx)
- [apps/portal/features/hub/components/AlertTicker.tsx](file://apps/portal/features/hub/components/AlertTicker.tsx)
- [apps/portal/features/hub/components/ProductionTrendWrapper.tsx](file://apps/portal/features/hub/components/ProductionTrendWrapper.tsx)
- [apps/portal/features/hub/components/HeroBackground.tsx](file://apps/portal/features/hub/components/HeroBackground.tsx)
- [apps/portal/features/hub/components/HeroRotator.tsx](file://apps/portal/features/hub/components/HeroRotator.tsx)
- [apps/portal/features/hub/components/ToolBanner.tsx](file://apps/portal/features/hub/components/ToolBanner.tsx)
- [apps/portal/components/nav/BottomNav.tsx](file://apps/portal/components/nav/BottomNav.tsx)
- [apps/portal/components/system/SplitWindowLayout.tsx](file://apps/portal/components/system/SplitWindowLayout.tsx)
- [apps/portal/components/ai/AIAssistantWrapper.tsx](file://apps/portal/components/ai/AIAssistantWrapper.tsx)
- [apps/portal/components/nav/ActiveDepartmentSetter.tsx](file://apps/portal/components/nav/ActiveDepartmentSetter.tsx)
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

## Introduction

This document explains the portal application structure built with Next.js App Router. It focuses on route groups (auth, departments, hub), feature-based organization under features/, shared components under components/, and cross-cutting concerns under lib/. It also details middleware architecture for authentication and routing, layout composition patterns, dynamic department routing, component hierarchy from global layouts to department-specific UIs, state management patterns, and error boundary implementations.

## Project Structure

The portal uses a feature-based layout:

- Route groups:
  - (auth): Authentication-related routes and their layout.
  - (departments): Dynamic department routes and department-specific pages.
  - (hub): Central hub landing page and its layout.
- Features:
  - features/: Feature modules grouped by domain (e.g., hub, analytics, departments).
- Shared UI:
  - components/: Reusable UI components used across the app.
- Cross-cutting concerns:
  - lib/: Utilities, caching, environment, and domain helpers.

```mermaid
graph TB
Root["Root Layout<br/>apps/portal/app/layout.tsx"] --> AuthGroup["Auth Group Layout<br/>apps/portal/app/(auth)/layout.tsx"]
Root --> HubGroup["Hub Group Layout<br/>apps/portal/app/(hub)/layout.tsx"]
Root --> DeptGroup["Dynamic Department Layout<br/>apps/portal/app/(departments)/[department]/layout.tsx"]
HubGroup --> HubPage["Hub Page<br/>apps/portal/app/(hub)/page.tsx"]
DeptGroup --> DeptLoading["Department Loading<br/>apps/portal/app/(departments)/loading.tsx"]
DeptGroup --> AccessControl["Access Control Dashboard<br/>apps/portal/app/(departments)/access-control/page.tsx"]
HubPage --> HubFeatures["Hub Features<br/>features/hub/components/*"]
DeptGroup --> DeptLib["Departments Config<br/>lib/departments.ts"]
Root --> SplitWindow["Split Window Layout<br/>components/system/SplitWindowLayout.tsx"]
Root --> AIAssistant["AI Assistant Wrapper<br/>components/ai/AIAssistantWrapper.tsx"]
HubGroup --> BottomNav["Bottom Navigation<br/>components/nav/BottomNav.tsx"]
DeptGroup --> ActiveDeptSetter["Active Department Setter<br/>components/nav/ActiveDepartmentSetter.tsx"]
```

**Diagram sources**

- [apps/portal/app/layout.tsx](file://apps/portal/app/layout.tsx)
- [apps/portal/app/(auth)/layout.tsx](<file://apps/portal/app/(auth)/layout.tsx>)
- [apps/portal/app/(hub)/layout.tsx](<file://apps/portal/app/(hub)/layout.tsx>)
- [apps/portal/app/(departments)/[department]/layout.tsx](<file://apps/portal/app/(departments)/[department]/layout.tsx>)
- [apps/portal/app/(departments)/loading.tsx](<file://apps/portal/app/(departments)/loading.tsx>)
- [apps/portal/app/(departments)/access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx>)
- [apps/portal/app/(hub)/page.tsx](<file://apps/portal/app/(hub)/page.tsx>)
- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)
- [apps/portal/components/system/SplitWindowLayout.tsx](file://apps/portal/components/system/SplitWindowLayout.tsx)
- [apps/portal/components/ai/AIAssistantWrapper.tsx](file://apps/portal/components/ai/AIAssistantWrapper.tsx)
- [apps/portal/components/nav/BottomNav.tsx](file://apps/portal/components/nav/BottomNav.tsx)
- [apps/portal/components/nav/ActiveDepartmentSetter.tsx](file://apps/portal/components/nav/ActiveDepartmentSetter.tsx)

**Section sources**

- [apps/portal/app/layout.tsx](file://apps/portal/app/layout.tsx)
- [apps/portal/app/(auth)/layout.tsx](<file://apps/portal/app/(auth)/layout.tsx>)
- [apps/portal/app/(hub)/layout.tsx](<file://apps/portal/app/(hub)/layout.tsx>)
- [apps/portal/app/(departments)/[department]/layout.tsx](<file://apps/portal/app/(departments)/[department]/layout.tsx>)
- [apps/portal/app/(departments)/loading.tsx](<file://apps/portal/app/(departments)/loading.tsx>)
- [apps/portal/app/(departments)/access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx>)
- [apps/portal/app/(hub)/page.tsx](<file://apps/portal/app/(hub)/page.tsx>)
- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)

## Core Components

- Global root layout:
  - Provides theme provider, client providers, performance listeners, offline banner, AI assistant wrapper, header widgets, main content area with split window layout, command bar, viewport boundaries, and accessibility announcer.
- Auth group layout:
  - Minimal container for authentication flows.
- Hub group layout:
  - Server-side user check with redirect to login if not authenticated; fetches accessible departments and renders bottom navigation for mobile.
- Dynamic department layout:
  - Validates department against configuration, sets active department context, provides department tabs, and wraps content with department layout and AI assistant wrapper.
- Hub page:
  - Aggregates dashboard counts, accessible departments, tools, alerts, and production trend data; uses Suspense for streaming heavy sections; filters departments based on user access.
- Access control dashboard page:
  - Demonstrates server-side data fetching via actions and dynamic imports for charting and KPI components.

Key responsibilities:

- Authentication gating at layout level for protected areas.
- Department validation and tab resolution.
- Streaming UX via Suspense and dynamic imports.
- Context setup for active department.

**Section sources**

- [apps/portal/app/layout.tsx](file://apps/portal/app/layout.tsx)
- [apps/portal/app/(auth)/layout.tsx](<file://apps/portal/app/(auth)/layout.tsx>)
- [apps/portal/app/(hub)/layout.tsx](<file://apps/portal/app/(hub)/layout.tsx>)
- [apps/portal/app/(departments)/[department]/layout.tsx](<file://apps/portal/app/(departments)/[department]/layout.tsx>)
- [apps/portal/app/(hub)/page.tsx](<file://apps/portal/app/(hub)/page.tsx>)
- [apps/portal/app/(departments)/access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx>)

## Architecture Overview

The portal follows a layered architecture:

- Presentation layer: Route groups and pages render feature components and shared UI.
- Business logic layer: Feature components orchestrate data fetching and display.
- Cross-cutting layer: lib utilities provide caching, environment, and domain helpers.
- Infrastructure integration: Supabase clients for read replicas and server auth.

```mermaid
graph TB
subgraph "Route Groups"
A["(auth)/layout.tsx"]
B["(hub)/layout.tsx"]
C["(departments)/[department]/layout.tsx"]
end
subgraph "Pages"
D["(hub)/page.tsx"]
E["(departments)/access-control/page.tsx"]
end
subgraph "Features"
F["features/hub/components/*"]
end
subgraph "Shared UI"
G["components/system/SplitWindowLayout.tsx"]
H["components/nav/BottomNav.tsx"]
I["components/ai/AIAssistantWrapper.tsx"]
end
subgraph "Cross-Cutting"
J["lib/departments.ts"]
end
A --> D
B --> D
C --> E
D --> F
C --> J
D --> H
C --> I
D --> G
```

**Diagram sources**

- [apps/portal/app/(auth)/layout.tsx](<file://apps/portal/app/(auth)/layout.tsx>)
- [apps/portal/app/(hub)/layout.tsx](<file://apps/portal/app/(hub)/layout.tsx>)
- [apps/portal/app/(departments)/[department]/layout.tsx](<file://apps/portal/app/(departments)/[department]/layout.tsx>)
- [apps/portal/app/(hub)/page.tsx](<file://apps/portal/app/(hub)/page.tsx>)
- [apps/portal/app/(departments)/access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx>)
- [apps/portal/features/hub/components/DepartmentCard.tsx](file://apps/portal/features/hub/components/DepartmentCard.tsx)
- [apps/portal/features/hub/components/AlertTicker.tsx](file://apps/portal/features/hub/components/AlertTicker.tsx)
- [apps/portal/features/hub/components/ProductionTrendWrapper.tsx](file://apps/portal/features/hub/components/ProductionTrendWrapper.tsx)
- [apps/portal/features/hub/components/HeroBackground.tsx](file://apps/portal/features/hub/components/HeroBackground.tsx)
- [apps/portal/features/hub/components/HeroRotator.tsx](file://apps/portal/features/hub/components/HeroRotator.tsx)
- [apps/portal/features/hub/components/ToolBanner.tsx](file://apps/portal/features/hub/components/ToolBanner.tsx)
- [apps/portal/components/nav/BottomNav.tsx](file://apps/portal/components/nav/BottomNav.tsx)
- [apps/portal/components/system/SplitWindowLayout.tsx](file://apps/portal/components/system/SplitWindowLayout.tsx)
- [apps/portal/components/ai/AIAssistantWrapper.tsx](file://apps/portal/components/ai/AIAssistantWrapper.tsx)
- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)

## Detailed Component Analysis

### Global Root Layout

- Responsibilities:
  - Theme provider and client providers.
  - Accessibility announcer and skip link.
  - Header with focus mode toggle, system tray pill, and header widgets.
  - Main content wrapped in split window layout.
  - Command bar, viewport boundaries, and background.
- Performance:
  - Preconnect/dns-prefetch for Supabase.
  - Speculation rules for prerendering key routes.
  - Dynamic import for header widgets with loading skeleton.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant Root as "Root Layout"
participant Providers as "ClientProviders"
participant Focus as "FocusModeProvider"
participant Shell as "SplitWindowLayout"
participant Child as "Route Group/Page"
Browser->>Root : Request "/"
Root->>Providers : Wrap children
Providers->>Focus : Wrap children
Focus->>Shell : Render main content
Shell->>Child : Render route group/page
Child-->>Shell : Content
Shell-->>Focus : Content
Focus-->>Providers : Content
Providers-->>Root : Content
Root-->>Browser : HTML
```

**Diagram sources**

- [apps/portal/app/layout.tsx](file://apps/portal/app/layout.tsx)

**Section sources**

- [apps/portal/app/layout.tsx](file://apps/portal/app/layout.tsx)

### Auth Group Layout

- Purpose:
  - Container for authentication flows.
- Behavior:
  - Provides minimal layout for login/reset/update-password routes.

**Section sources**

- [apps/portal/app/(auth)/layout.tsx](<file://apps/portal/app/(auth)/layout.tsx>)

### Hub Group Layout

- Responsibilities:
  - Server-side authentication check using Supabase client and getUserSafely.
  - Redirect to login if unauthenticated.
  - Fetch accessible department names and pass to bottom navigation.
- Data flow:
  - Uses read replica client to query employees and departments.

```mermaid
sequenceDiagram
participant Client as "Client"
participant HubLayout as "Hub Layout"
participant Supa as "Supabase Server Client"
participant DB as "Read Replica DB"
participant Nav as "BottomNav"
Client->>HubLayout : GET /
HubLayout->>Supa : createServerSupabaseClient()
HubLayout->>Supa : getUserSafely(supabase)
alt User not found
HubLayout-->>Client : redirect("/login")
else User exists
HubLayout->>DB : Query accessible_departments + departments
DB-->>HubLayout : Department names
HubLayout->>Nav : Pass accessibleDepartments
HubLayout-->>Client : Render hub shell
end
```

**Diagram sources**

- [apps/portal/app/(hub)/layout.tsx](<file://apps/portal/app/(hub)/layout.tsx>)
- [apps/portal/components/nav/BottomNav.tsx](file://apps/portal/components/nav/BottomNav.tsx)

**Section sources**

- [apps/portal/app/(hub)/layout.tsx](<file://apps/portal/app/(hub)/layout.tsx>)

### Dynamic Department Layout

- Responsibilities:
  - Validate department name against DEPARTMENTS config.
  - Resolve department-specific tabs via getDepartmentTabs.
  - Set active department context and wrap content with DepartmentLayout and AI assistant wrapper.
- Error handling:
  - Calls notFound when department is invalid.

```mermaid
flowchart TD
Start(["Request /:department"]) --> Params["Extract department param"]
Params --> FindDept["Find dept in DEPARTMENTS"]
FindDept --> Valid{"Valid department?"}
Valid --> |No| NotFound["notFound()"]
Valid --> |Yes| Tabs["getDepartmentTabs(department)"]
Tabs --> SetCtx["ActiveDepartmentSetter"]
SetCtx --> Wrap["DepartmentLayout + AIAssistantWrapper"]
Wrap --> End(["Render child page"])
```

**Diagram sources**

- [apps/portal/app/(departments)/[department]/layout.tsx](<file://apps/portal/app/(departments)/[department]/layout.tsx>)
- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)
- [apps/portal/components/nav/ActiveDepartmentSetter.tsx](file://apps/portal/components/nav/ActiveDepartmentSetter.tsx)
- [apps/portal/components/ai/AIAssistantWrapper.tsx](file://apps/portal/components/ai/AIAssistantWrapper.tsx)

**Section sources**

- [apps/portal/app/(departments)/[department]/layout.tsx](<file://apps/portal/app/(departments)/[department]/layout.tsx>)
- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)

### Hub Page

- Responsibilities:
  - Authenticate user and redirect if missing.
  - Aggregate dashboard counts, accessible departments, tools, and alert events.
  - Stream production trend data via Suspense.
  - Filter departments based on user access.
- Caching:
  - Uses cachedRSC and withCache with tags for revalidation.

```mermaid
sequenceDiagram
participant Client as "Client"
participant HubPage as "Hub Page"
participant Supa as "Supabase Server Client"
participant Cache as "cachedRSC/withCache"
participant DB as "Read Replica DB"
participant Features as "Hub Features"
Client->>HubPage : GET /
HubPage->>Supa : getUserSafely()
alt Unauthenticated
HubPage-->>Client : redirect("/login")
else Authenticated
HubPage->>Cache : getDashboardCounts(today, userId)
Cache->>DB : Count incidents/breakdowns/offline machines
DB-->>Cache : Counts
HubPage->>Cache : getEmployeeDepartments(userId)
Cache->>DB : Employees + Departments
DB-->>Cache : Accessible dept names
HubPage->>Cache : getRecentAlertEvents(today, userId)
Cache->>DB : Incidents + Breakdowns
DB-->>Cache : Alert events
HubPage->>Features : Render Hero, Alerts, Departments, Tools
HubPage->>Features : Suspense -> ProductionTrendSection
Features-->>Client : Streamed UI
end
```

**Diagram sources**

- [apps/portal/app/(hub)/page.tsx](<file://apps/portal/app/(hub)/page.tsx>)
- [apps/portal/features/hub/components/AlertTicker.tsx](file://apps/portal/features/hub/components/AlertTicker.tsx)
- [apps/portal/features/hub/components/ProductionTrendWrapper.tsx](file://apps/portal/features/hub/components/ProductionTrendWrapper.tsx)
- [apps/portal/features/hub/components/HeroBackground.tsx](file://apps/portal/features/hub/components/HeroBackground.tsx)
- [apps/portal/features/hub/components/HeroRotator.tsx](file://apps/portal/features/hub/components/HeroRotator.tsx)
- [apps/portal/features/hub/components/ToolBanner.tsx](file://apps/portal/features/hub/components/ToolBanner.tsx)
- [apps/portal/features/hub/components/DepartmentCard.tsx](file://apps/portal/features/hub/components/DepartmentCard.tsx)

**Section sources**

- [apps/portal/app/(hub)/page.tsx](<file://apps/portal/app/(hub)/page.tsx>)

### Access Control Dashboard Page

- Responsibilities:
  - Get department context (deptId, today).
  - Fetch metrics, activity, entity status, hourly stats, and badge distribution concurrently.
  - Dynamically import chart and KPI components with skeletons.
- Rendering:
  - Glass cards and grid layouts for KPIs, charts, activity feed, and entity status.

```mermaid
sequenceDiagram
participant Client as "Client"
participant ACPage as "Access Control Page"
participant Ctx as "getDepartmentContext"
participant Actions as "actions.ts"
participant Charts as "Dynamic Components"
Client->>ACPage : GET /access-control
ACPage->>Ctx : { department : "access-control" }
Ctx-->>ACPage : { deptId, today }
ACPage->>Actions : getAccessControlMetrics(deptId)
ACPage->>Actions : getRecentAccessActivity(deptId, 8)
ACPage->>Actions : getEntityBadgeStatus(deptId)
ACPage->>Actions : getHourlyAccessStats(deptId, today)
ACPage->>Actions : getBadgeStatusDistribution(deptId)
ACPage->>Charts : Import DashboardKPIGrid/DashboardChartsRow/etc.
Charts-->>ACPage : Rendered UI
ACPage-->>Client : Dashboard
```

**Diagram sources**

- [apps/portal/app/(departments)/access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx>)

**Section sources**

- [apps/portal/app/(departments)/access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx>)

### Feature-Based Organization

- Hub features:
  - DepartmentCard, AlertTicker, ProductionTrendWrapper, HeroBackground, HeroRotator, ToolBanner.
- Department features:
  - Control room, engineering breakdowns, safety, satellite monitoring, tools.
- Analytics features:
  - ExportButton, PDFDownloadButton, ProductionTrendChart, ReportTemplate.
- Webhooks features:
  - WebhookManager.

These components are consumed by pages and layouts within their respective route groups.

**Section sources**

- [apps/portal/features/hub/components/DepartmentCard.tsx](file://apps/portal/features/hub/components/DepartmentCard.tsx)
- [apps/portal/features/hub/components/AlertTicker.tsx](file://apps/portal/features/hub/components/AlertTicker.tsx)
- [apps/portal/features/hub/components/ProductionTrendWrapper.tsx](file://apps/portal/features/hub/components/ProductionTrendWrapper.tsx)
- [apps/portal/features/hub/components/HeroBackground.tsx](file://apps/portal/features/hub/components/HeroBackground.tsx)
- [apps/portal/features/hub/components/HeroRotator.tsx](file://apps/portal/features/hub/components/HeroRotator.tsx)
- [apps/portal/features/hub/components/ToolBanner.tsx](file://apps/portal/features/hub/components/ToolBanner.tsx)

### Cross-Cutting Concerns (lib/)

- Departments configuration:
  - DEPARTMENTS array, tab definitions per department, and getDepartmentTabs resolver.
- Caching utilities:
  - cachedRSC and withCache for server-side caching with tags and revalidation.
- Environment and tools:
  - env helpers and tools retrieval.

**Section sources**

- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)

## Dependency Analysis

High-level dependencies between route groups, pages, features, and shared components:

```mermaid
graph LR
Root["Root Layout"] --> Split["SplitWindowLayout"]
Root --> AI["AIAssistantWrapper"]
HubLayout["Hub Layout"] --> BottomNav["BottomNav"]
HubPage["Hub Page"] --> DeptCard["DepartmentCard"]
HubPage --> AlertTicker["AlertTicker"]
HubPage --> ProdTrend["ProductionTrendWrapper"]
HubPage --> HeroBg["HeroBackground"]
HubPage --> HeroRot["HeroRotator"]
HubPage --> ToolBanner["ToolBanner"]
DeptLayout["Department Layout"] --> ActiveDept["ActiveDepartmentSetter"]
DeptLayout --> AI
DeptLayout --> LibDepts["lib/departments.ts"]
ACPage["Access Control Page"] --> Actions["actions.ts"]
```

**Diagram sources**

- [apps/portal/app/layout.tsx](file://apps/portal/app/layout.tsx)
- [apps/portal/app/(hub)/layout.tsx](<file://apps/portal/app/(hub)/layout.tsx>)
- [apps/portal/app/(hub)/page.tsx](<file://apps/portal/app/(hub)/page.tsx>)
- [apps/portal/app/(departments)/[department]/layout.tsx](<file://apps/portal/app/(departments)/[department]/layout.tsx>)
- [apps/portal/app/(departments)/access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx>)
- [apps/portal/components/system/SplitWindowLayout.tsx](file://apps/portal/components/system/SplitWindowLayout.tsx)
- [apps/portal/components/ai/AIAssistantWrapper.tsx](file://apps/portal/components/ai/AIAssistantWrapper.tsx)
- [apps/portal/components/nav/BottomNav.tsx](file://apps/portal/components/nav/BottomNav.tsx)
- [apps/portal/components/nav/ActiveDepartmentSetter.tsx](file://apps/portal/components/nav/ActiveDepartmentSetter.tsx)
- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)
- [apps/portal/features/hub/components/DepartmentCard.tsx](file://apps/portal/features/hub/components/DepartmentCard.tsx)
- [apps/portal/features/hub/components/AlertTicker.tsx](file://apps/portal/features/hub/components/AlertTicker.tsx)
- [apps/portal/features/hub/components/ProductionTrendWrapper.tsx](file://apps/portal/features/hub/components/ProductionTrendWrapper.tsx)
- [apps/portal/features/hub/components/HeroBackground.tsx](file://apps/portal/features/hub/components/HeroBackground.tsx)
- [apps/portal/features/hub/components/HeroRotator.tsx](file://apps/portal/features/hub/components/HeroRotator.tsx)
- [apps/portal/features/hub/components/ToolBanner.tsx](file://apps/portal/features/hub/components/ToolBanner.tsx)

**Section sources**

- [apps/portal/app/layout.tsx](file://apps/portal/app/layout.tsx)
- [apps/portal/app/(hub)/layout.tsx](<file://apps/portal/app/(hub)/layout.tsx>)
- [apps/portal/app/(hub)/page.tsx](<file://apps/portal/app/(hub)/page.tsx>)
- [apps/portal/app/(departments)/[department]/layout.tsx](<file://apps/portal/app/(departments)/[department]/layout.tsx>)
- [apps/portal/app/(departments)/access-control/page.tsx](<file://apps/portal/app/(departments)/access-control/page.tsx>)
- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)

## Performance Considerations

- Streaming:
  - Use Suspense for heavy sections like production trends to stream after shell paints.
- Dynamic Imports:
  - Lazy-load complex components (charts, KPI grids) with loading skeletons.
- Caching:
  - Leverage cachedRSC and withCache with tags for efficient revalidation and cache busting.
- Preconnect and Speculation Rules:
  - Preconnect to Supabase and configure speculation rules for prerendering key routes.
- Read Replicas:
  - Use read replica clients for database queries to reduce load on primary.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

- Authentication redirects:
  - If users are redirected to login unexpectedly, verify getUserSafely behavior and cookie presence in protected layouts.
- Department not found:
  - Ensure department names match DEPARTMENTS entries; otherwise, notFound will be triggered.
- Empty department list:
  - Check employee accessible_departments mapping and department IDs; ensure proper filtering in hub page.
- Stale data:
  - Inspect cache tags and revalidate intervals; clear or update tags when underlying tables change.

**Section sources**

- [apps/portal/app/(hub)/layout.tsx](<file://apps/portal/app/(hub)/layout.tsx>)
- [apps/portal/app/(departments)/[department]/layout.tsx](<file://apps/portal/app/(departments)/[department]/layout.tsx>)
- [apps/portal/app/(hub)/page.tsx](<file://apps/portal/app/(hub)/page.tsx>)
- [apps/portal/lib/departments.ts](file://apps/portal/lib/departments.ts)

## Conclusion

The portal leverages Next.js App Router with route groups to separate concerns, feature-based organization for scalability, and robust layout composition for consistent UX. Authentication is enforced at layout levels, while dynamic department routing ensures type-safe navigation and tab resolution. Caching and streaming strategies optimize performance, and shared components maintain consistency across the application.

[No sources needed since this section summarizes without analyzing specific files]
