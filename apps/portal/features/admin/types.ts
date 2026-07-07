export interface Machine {
  id: string;
  name: string;
  machine_type: string;
  serial_number: string | null;
  bin_factor: number | null;
  active: boolean;
  report_exempt: boolean;
  department_id: string;
  site_id: string | null;
  created_at: string;
  department: { display_name: string } | null;
  site: { name: string; site_code: string } | null;
}

export interface Department {
  id: string;
  display_name: string;
}

export interface Site {
  id: string;
  name: string;
  site_code: string;
  active: boolean;
}
