# Product Specifications: Production Module

## 1. Overview & Business Value
Monitors and logs coal yield, extraction tonnage, and machinery productivity. Ensures Plantcor achieves its daily extraction targets safely and efficiently.

## 2. Target Personas
- **Production Supervisors**: Require shift-by-shift tonnage logs to verify if extraction quotas are met.
- **Excavator & Truck Operators**: Require a simple interface to log cycles and machine status.
- **General Plantcor Managers**: Need long-term historical trends to present yield data to executives.

## 3. Core Features & Capabilities
- **Yield Tracker**: Real-time extraction tonnage compared against daily target metrics.
- **Daily Production Log**: Shift logging for yield, machine utilization, and operational hours.
- **Equipment Log**: A central directory tracking active machines assigned to production.

## 4. Key Performance Indicators (KPIs) & Metrics
- **Total Daily Tonnage**: Net weight of coal extracted in tons.
- **Yield Efficiency**: Actual production yield as a percentage of the daily target (e.g., 85%).
- **Active Equipment Ratio**: Ratio of operational excavators and dump trucks to idle ones.

## 5. Security & Access Boundaries
Requires `production` or `admin` role. Rows are protected by Supabase RLS policies tied to employee department associations.
