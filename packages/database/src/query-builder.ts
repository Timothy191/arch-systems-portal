// packages/database/src/query-builder.ts
import { db } from "./index";
import type { DepartmentRow, EmployeeRow, MachineRow, DailyLogRow, MachineHoursRow } from "./types";

// Type-safe query functions for departments
export const departmentRepository = {
  async getAll(): Promise<DepartmentRow[]> {
    return db.query("SELECT * FROM departments").execute();
  },

  async getById(id: string): Promise<DepartmentRow | null> {
    return db.query("SELECT * FROM departments WHERE id = $1").execute(id);
  },

  async create(dept: Omit<DepartmentRow, "id" | "created_at">): Promise<DepartmentRow> {
    return db
      .query(
        "INSERT INTO departments (name, display_name, icon, description, color) VALUES ($1, $2, $3, $4, $5) RETURNING *"
      )
      .execute(dept.name, dept.display_name, dept.icon, dept.description, dept.color)
      .execute();
  },
};

// Type-safe query functions for employees
export const employeeRepository = {
  async getByAuthId(authId: string): Promise<EmployeeRow | null> {
    return db.query("SELECT * FROM employees WHERE auth_id = $1").execute(authId);
  },

  async getByDepartment(deptId: string): Promise<EmployeeRow[]> {
    return db.query("SELECT * FROM employees WHERE department_id = $1").execute(deptId);
  },

  async updateRole(authId: string, newRole: string): Promise<void> {
    await db.query("UPDATE employees SET role = $1 WHERE auth_id = $2").execute(newRole, authId);
  },
};

// Type-safe query functions for machines
export const machineRepository = {
  async getActiveByDepartment(deptId: string): Promise<MachineRow[]> {
    return db
      .query("SELECT * FROM machines WHERE department_id = $1 AND active = true")
      .execute(deptId);
  },

  async getById(machineId: string): Promise<MachineRow | null> {
    return db.query("SELECT * FROM machines WHERE id = $1").execute(machineId);
  },
};

// Type-safe query functions for daily logs
export const dailyLogRepository = {
  async getByDateRange(startDate: string, endDate: string): Promise<DailyLogRow[]> {
    return db
      .query("SELECT * FROM daily_logs WHERE log_date BETWEEN $1 AND $2")
      .execute(startDate, endDate);
  },

  async getByDepartment(deptId: string): Promise<DailyLogRow[]> {
    return db.query("SELECT * FROM daily_logs WHERE department_id = $1").execute(deptId);
  },
};

// Type-safe query functions for machine hours
export const machineHoursRepository = {
  async getHoursByMachine(machineId: string): Promise<MachineHoursRow[]> {
    return db.query("SELECT * FROM machine_hours WHERE machine_id = $1").execute(machineId);
  },

  async getByDailyLog(dailyLogId: string): Promise<MachineHoursRow[]> {
    return db.query("SELECT * FROM machine_hours WHERE daily_log_id = $1").execute(dailyLogId);
  },
};
