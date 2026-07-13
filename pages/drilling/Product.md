# Product Specifications: Drilling Module

## 1. Overview & Business Value
Real-time tracking of drill rig telemetry, depth logs, and drilling rate of penetration (ROP) to improve mining operation efficiency and prevent drilling delays.

## 2. Target Personas
- **Drilling Engineers**: Need detailed telemetry data (ROP, bit depth, motor temperature) to optimize drilling parameters.
- **Rig Operators**: Need quick logging interfaces for daily shifts, delays, and telemetry status.
- **Operations Managers**: Need aggregated reports of total depth, hours drilled, and delays to evaluate yield forecasts.

## 3. Core Features & Capabilities
- **Drilling Telemetry**: Real-time visualization of active rig depth and bit indicators.
- **Operations Logging**: Structured forms to log drilling progress and shift reports.
- **Operational Delays**: Logging and classification of delays (machinery issues, geological anomalies, etc.) to analyze downtime.

## 4. Key Performance Indicators (KPIs) & Metrics
- **Active Rig Count**: Number of drilling rigs currently operational.
- **Rate of Penetration (ROP)**: Speed of drilling (meters/hour).
- **Daily Hours Logged**: Cumulative operating hours across all rigs.
- **Lost Time due to Delays**: Duration and count of drilling interruptions.

## 5. Security & Access Boundaries
Restricted to Drilling personnel and site administrators. Access is governed by the `drilling` department role in Supabase RLS.
