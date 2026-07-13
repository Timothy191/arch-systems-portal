# Product Specifications: Operations Hub Module

## 1. Overview & Business Value
The primary entry landing page and executive dashboard of the Plantcor Portal. Provides a unified overview of all mining departments and quick actions.

## 2. Target Personas
- **Plantcor Executives**: Need a high-level overview of active departments, safety numbers, and daily tonnage stats.
- **Operations Coordinators**: Need a starting pad to jump to specific logs, calendars, and dashboards.
- **Site Visitors**: Need a welcome screen indicating site weather, current shift, and active safety status.

## 3. Core Features & Capabilities
- **Unified Dashboard Grid**: Department cards displaying displayName, current status, and key metrics at a glance.
- **Global Command Search**: Keyboard shortcut (`Cmd+K` or `Ctrl+K`) opening the operations search bar.
- **Operations Summary Panel**: Aggregated overview of extraction output, personnel on-site, and safety milestones.

## 4. Key Performance Indicators (KPIs) & Metrics
- **Dashboard Engagement**: Daily active users accessing the hub.
- **Navigation Speed**: Average time to navigate to a target sub-department.
- **Search Efficiency**: Click-through rate on command bar queries.

## 5. Security & Access Boundaries
Requires valid Supabase session. Displays aggregated metrics based on user clearance levels.
