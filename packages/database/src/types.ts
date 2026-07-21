// packages/database/src/types.ts
// Type-safe database schema for PostgreSQL native migration

export type Json = Record<string, unknown> | unknown[];

// Auth users table (for PostgreSQL native auth)
export interface AuthUsers {
  id: string;
  email: string;
  encrypted_password: string;
  email_confirmed_at: Date | null;
  invited_at: Date | null;
  confirmation_sent_at: Date | null;
  recovery_sent_at: Date | null;
  last_sign_in_at: Date | null;
  role: string | null;
  updated_at: Date;
  created_at: Date;
  is_super_admin: boolean;
  banned_until: Date | null;
  phone: string | null;
  raw_user_meta_data: Json | null;
  raw_app_meta_data: Json | null;
}

// Departments
export interface Departments {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  description: string | null;
  color: string;
  created_at: Date;
}

// Employees
export interface Employees {
  id: string;
  auth_id: string;
  department_id: string | null;
  full_name: string;
  role: string;
  accessible_departments: string[] | null;
  created_at: Date;
}

// Machines
export interface Machines {
  id: string;
  department_id: string;
  name: string;
  machine_type: string;
  serial_number: string | null;
  active: boolean;
  created_at: Date;
  report_exempt?: boolean;
}

// Daily logs
export interface DailyLogs {
  id: string;
  department_id: string;
  log_date: string; // DATE type
  shift: "day" | "night";
  notes: string | null;
  created_at: Date;
}

// Machine hours
export interface MachineHours {
  id: string;
  daily_log_id: string;
  machine_id: string;
  hours_worked: number;
  created_at: Date;
}

// Webhook endpoints
export interface WebhookEndpoints {
  id?: string;
  url: string;
  description: string | null;
  event_types: string[];
  department_id: string | null;
  active: boolean | null;
  deleted_at: string | null;
  created_at?: Date;
  updated_at: Date | null;
}

// Webhook delivery logs
export interface WebhookDeliveryLogs {
  id: string;
  webhook_endpoint_id: string;
  delivery_status: string;
  payload: Json;
  response: Json | null;
  created_at: Date;
  error_message: string | null;
}

// Audit logs
export interface AuditLogs {
  id?: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: Json | null;
  new_values: Json | null;
  user_id: string | null;
  created_at?: Date;
}

// Access logs
export interface AccessLogs {
  id?: string;
  badge_id: string | null;
  access_type: string;
  direction: "IN" | "OUT";
  gate_location: string;
  access_granted?: boolean;
  denial_reason: string | null;
  scanned_at?: Date;
  department_id?: string | null;
}

// Control room shifts
export interface ControlRoomShifts {
  id: string;
  department_id: string;
  shift_date: string;
  shift_type: "day" | "night";
  crew_size: number;
  notes: string | null;
  created_at: Date;
}

// Control room activities
export interface ControlRoomActivities {
  id: string;
  shift_id: string;
  activity_type: string;
  description: string;
  recorded_by: string;
  created_at: Date;
}

// Minimal interfaces for tables used in services
export interface Badges {
  id?: string;
  qr_code: string;
  entity_type: "personnel" | "visitor";
  personnel_id: string | null;
  visitor_id: string | null;
  is_active?: boolean;
  issued_at?: Date;
  revoked_at?: Date | null;
}

export interface Personnel {
  id: string;
  first_name: string;
  surname: string;
  status: string;
  department_id: string | null;
  created_at: Date;
}

export interface Visitors {
  id: string;
  name: string;
  status: string;
  company: string | null;
  created_at: Date;
}

export interface MachineOperations {
  id: string;
  machine_id: string;
  shift_date: string;
  shift_type: "day" | "night";
  hours_operated: number;
  total_loads: number;
  created_at: Date;
}

export interface ExcavatorActivity {
  id: string;
  excavator_id: string;
  activity_date: string;
  shift_type: "day" | "night";
  hours_worked: number;
  loads_count: number;
  created_at: Date;
}

export interface DozerRolls {
  id: string;
  dozer_id: string;
  roll_date: string;
  shift_type: "day" | "night";
  rolls_count: number;
  created_at: Date;
}

// Additional table interfaces (minimal)
export interface AiUsageLogs {
  id: string;
  model: string;
  tokens: number;
  created_at: Date;
}

export interface Breakdowns {
  id: string;
  machine_id: string;
  delay_category_id: string;
  duration_minutes: number;
  created_at: Date;
}

export interface CacheAnomalies {
  id: string;
  cache_key: string;
  anomaly_type: string;
  created_at: Date;
}

export interface CacheEvents {
  id: string;
  event_type: string;
  payload: Json;
  created_at: Date;
}

export interface DelayCategories {
  id: string;
  name: string;
  category: string;
  created_at: Date;
}

export interface Documents {
  id: string;
  title: string;
  content: string;
  created_at: Date;
}

export interface DocumentVersions {
  id: string;
  document_id: string;
  version: number;
  content: string;
  created_at: Date;
}

export interface DozerRollsArchive {
  id: string;
  dozer_id: string;
  roll_date: string;
  shift_type: string;
  rolls_count: number;
  created_at: Date;
}

export interface DrillOperations {
  id: string;
  machine_id: string;
  shift_date: string;
  shift_type: "day" | "night";
  meters_drilled: number;
  created_at: Date;
}

export interface DrillOperationsArchive {
  id: string;
  machine_id: string;
  shift_date: string;
  shift_type: string;
  meters_drilled: number;
  created_at: Date;
}

export interface EmbeddingCache {
  id: string;
  model: string;
  input_hash: string;
  embedding: number[];
  created_at: Date;
}

export interface EngineeringNotes {
  id: string;
  title: string;
  content: string;
  created_at: Date;
}

export interface EngineeringNotesArchive {
  id: string;
  title: string;
  content: string;
  created_at: Date;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  department_id: string | null;
  created_at: Date;
}

export interface ExcavatorDumperAssignments {
  id: string;
  excavator_id: string;
  dumper_id: string;
  shift_date: string;
  shift_type: "day" | "night";
  created_at: Date;
}

export interface ExcavatorDumperAssignmentsArchive {
  id: string;
  excavator_id: string;
  dumper_id: string;
  shift_date: string;
  shift_type: string;
  created_at: Date;
}

export interface Fleet {
  id: string;
  name: string;
  department_id: string | null;
  created_at: Date;
}

export interface FuelLogs {
  id: string;
  machine_id: string;
  liters: number;
  created_at: Date;
}

export interface GeneratedReports {
  id: string;
  template_id: string;
  generated_by: string;
  output_path: string;
  created_at: Date;
}

export interface HourlyLoads {
  id: string;
  department_id: string;
  machine_id: string;
  load_date: string;
  shift_type: "day" | "night";
  hour_01: number;
  hour_02: number;
  hour_03: number;
  hour_04: number;
  hour_05: number;
  hour_06: number;
  hour_07: number;
  hour_08: number;
  hour_09: number;
  hour_10: number;
  hour_11: number;
  hour_12: number;
  total_loads: number;
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface MachineConfigurations {
  id: string;
  machine_id: string;
  config_key: string;
  config_value: Json;
  created_at: Date;
}

export interface MachineOperationsArchive {
  id: string;
  machine_id: string;
  shift_date: string;
  shift_type: string;
  hours_operated: number;
  total_loads: number;
  created_at: Date;
}

export interface MachineTelemetry {
  id: string;
  machine_id: string;
  timestamp: Date;
  data: Json;
  created_at: Date;
}

export interface MachineTelemetryArchive {
  id: string;
  machine_id: string;
  timestamp: Date;
  data: Json;
  created_at: Date;
}

export interface MaterializedViewRefreshLog {
  id: string;
  view_name: string;
  status: string;
  duration_ms: number;
  created_at: Date;
}

export interface MemoryEmbeddings {
  id: string;
  content_hash: string;
  embedding: number[];
  created_at: Date;
}

export interface MineBlocks {
  id: string;
  name: string;
  site_id: string | null;
  created_at: Date;
}

export interface OperationalDelays {
  id: string;
  machine_id: string;
  delay_category_id: string;
  duration_minutes: number;
  created_at: Date;
}

export interface OperationalDelaysArchive {
  id: string;
  machine_id: string;
  delay_category_id: string;
  duration_minutes: number;
  created_at: Date;
}

export interface Operators {
  id: string;
  name: string;
  employee_id: string | null;
  created_at: Date;
}

export interface ProductionLogs {
  id: string;
  machine_id: string;
  shift_date: string;
  shift_type: "day" | "night";
  production_data: Json;
  created_at: Date;
}

export interface ReportTemplates {
  id: string;
  name: string;
  template: string;
  created_at: Date;
}

export interface SafetyIncidentCategories {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
}

export interface SafetyIncidents {
  id: string;
  category_id: string;
  severity_id: string;
  description: string;
  reported_by: string;
  created_at: Date;
}

export interface SafetySeverities {
  id: string;
  name: string;
  level: number;
  created_at: Date;
}

export interface ShiftNotes {
  id: string;
  shift_id: string;
  note: string;
  created_by: string;
  created_at: Date;
}

export interface ShiftStatus {
  id: string;
  shift_id: string;
  status: string;
  updated_at: Date;
}

export interface Sites {
  id: string;
  name: string;
  location: string | null;
  created_at: Date;
}

export interface SyncWatermarks {
  id: string;
  table_name: string;
  last_synced_at: Date;
  created_at: Date;
}

export interface VectorSearchCache {
  id: string;
  query_hash: string;
  results: Json;
  created_at: Date;
}

export interface VectorSearchPerformance {
  id: string;
  query: string;
  duration_ms: number;
  created_at: Date;
}

// Row type aliases for query-builder
export type DepartmentRow = Departments;
export type EmployeeRow = Employees;
export type MachineRow = Machines;
export type DailyLogRow = DailyLogs;
export type MachineHoursRow = MachineHours;

// Main database interface
export interface Database {
  access_logs: AccessLogs;
  access_logs_archive: AccessLogs;
  ai_usage_logs: AiUsageLogs;
  audit_logs: AuditLogs;
  badges: Badges;
  breakdowns: Breakdowns;
  cache_anomalies: CacheAnomalies;
  cache_events: CacheEvents;
  daily_logs: DailyLogs;
  delay_categories: DelayCategories;
  departments: Departments;
  documents: Documents;
  document_versions: DocumentVersions;
  dozer_rolls: DozerRolls;
  dozer_rolls_archive: DozerRollsArchive;
  drill_operations: DrillOperations;
  drill_operations_archive: DrillOperationsArchive;
  embedding_cache: EmbeddingCache;
  employees: Employees;
  engineering_notes: EngineeringNotes;
  engineering_notes_archive: EngineeringNotesArchive;
  equipment: Equipment;
  excavator_activity: ExcavatorActivity;
  excavator_activity_archive: ExcavatorActivity;
  excavator_dumper_assignments: ExcavatorDumperAssignments;
  excavator_dumper_assignments_archive: ExcavatorDumperAssignmentsArchive;
  fleet: Fleet;
  fuel_logs: FuelLogs;
  generated_reports: GeneratedReports;
  hourly_loads: HourlyLoads;
  machine_configurations: MachineConfigurations;
  machine_hours: MachineHours;
  machine_operations: MachineOperations;
  machine_operations_archive: MachineOperationsArchive;
  machines: Machines;
  machine_telemetry: MachineTelemetry;
  machine_telemetry_archive: MachineTelemetryArchive;
  materialized_view_refresh_log: MaterializedViewRefreshLog;
  memory_embeddings: MemoryEmbeddings;
  mine_blocks: MineBlocks;
  operational_delays: OperationalDelays;
  operational_delays_archive: OperationalDelaysArchive;
  operators: Operators;
  personnel: Personnel;
  production_logs: ProductionLogs;
  report_templates: ReportTemplates;
  safety_incident_categories: SafetyIncidentCategories;
  safety_incidents: SafetyIncidents;
  safety_severities: SafetySeverities;
  shift_notes: ShiftNotes;
  shift_status: ShiftStatus;
  sites: Sites;
  sync_watermarks: SyncWatermarks;
  vector_search_cache: VectorSearchCache;
  vector_search_performance: VectorSearchPerformance;
  visitors: Visitors;
  webhook_delivery_logs: WebhookDeliveryLogs;
  webhook_endpoints: WebhookEndpoints;
  "auth.users": AuthUsers;
}
