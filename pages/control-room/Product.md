# Product Specifications: Control Room Module

## 1. Overview & Business Value
The central nervous system of the mine. Integrates SCADA feeds, monitors excavator productivity, tracks delay logs, and manages shift rollovers.

## 2. Target Personas
- **Control Room Operators**: Need a single pane of glass to monitor all operations, log delays, and dispatch resources.
- **Shift Supervisors**: Require detailed hourly load summaries and handover logs during rollovers.
- **Operations Executives**: Monitor operational flow to adjust daily extraction strategies.

## 3. Core Features & Capabilities
- **SCADA Alerts**: Real-time system alarms displaying errors or limits reached in processing plant equipment.
- **Hourly Load Tracker**: Automated dashboard charting active excavator cycle times and haul truck loads.
- **Shift Rollover**: Checklists and automated summaries to transfer operational responsibilities between shifts.

## 4. Key Performance Indicators (KPIs) & Metrics
- **Downtime Duration**: Minutes lost to delays or breakdowns during the shift.
- **Hourly Load Rate**: Number of truck loads dispatched per hour.
- **SCADA Alarm Frequency**: Count of high-priority alarms triggered.

## 5. Security & Access Boundaries
Restricted to Control Room operators and administrators. Enforced using JWT-based Supabase session validation and strict RLS policies.
