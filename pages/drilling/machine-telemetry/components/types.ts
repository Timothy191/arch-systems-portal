export interface TelemetryRecord {
  period: string;
  machine_id: string;
  machine_name: string;
  avg_engine_rpm: number | null;
  avg_engine_temp: number | null;
  avg_hydraulic_pressure: number | null;
  max_bit_depth: number | null;
  max_hole_depth: number | null;
  avg_penetration_rate: number | null;
  total_alerts: number;
  record_count: number;
}

export interface ArchivedMonth {
  id: string;
  year_month: string;
  machine_name: string;
  archived_at: string;
  record_count: number;
}

export interface DrillMonthlySummary {
  machine_id: string;
  machine_name: string;
  scheduled_hours: number | null;
  downtime_hours: number | null;
  productive_hours: number | null;
  availability_pct: number | null;
  utilization_pct: number | null;
}
