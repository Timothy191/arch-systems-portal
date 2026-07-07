import { useState } from "react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Machine, Department, Site } from "../types";
import { DUMPER_TYPES } from "../constants";

export function MachineForm({
  machine,
  departments,
  sites,
  error,
  saving,
  onSubmit,
  onCancel,
}: {
  machine: Machine | null;
  departments: Department[];
  sites: Site[];
  error: string;
  saving: boolean;
  onSubmit: (_data: {
    name: string;
    machine_type: string;
    serial_number: string;
    bin_factor: string;
    department_id: string;
    site_id: string;
    active: boolean;
    report_exempt: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(machine?.name || "");
  const [machineType, setMachineType] = useState(machine?.machine_type || "");
  const [serialNumber, setSerialNumber] = useState(
    machine?.serial_number || "",
  );
  const [binFactor, setBinFactor] = useState(
    machine?.bin_factor?.toString() || "",
  );
  const [departmentId, setDepartmentId] = useState(
    machine?.department_id || "",
  );
  const [siteId, setSiteId] = useState(machine?.site_id || "");
  const [active, setActive] = useState(machine?.active ?? true);
  const [reportExempt, setReportExempt] = useState(
    machine?.report_exempt ?? false,
  );

  const isDumperType = DUMPER_TYPES.some((t) =>
    machineType.toLowerCase().includes(t),
  );

  const activeSites = sites.filter((s) => s.active || s.id === siteId);

  const handleSubmit = (e: React.Formevent) => {
    e.preventDefault();
    onSubmit({
      name,
      machine_type: machineType,
      serial_number: serialNumber,
      bin_factor: binFactor,
      department_id: departmentId,
      site_id: siteId,
      active,
      report_exempt: reportExempt,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
          Name <span className="text-accent-red">*</span>
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Haul Truck 3"
          className="bg-[var(--bg-secondary)] border-[var(--border-default)]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
          Type <span className="text-accent-red">*</span>
        </label>
        <Input
          value={machineType}
          onChange={(e) => setMachineType(e.target.value)}
          placeholder="e.g. dump_truck, excavator, dozer"
          className="bg-[var(--bg-secondary)] border-[var(--border-default)]"
          required
        />
      </div>

      {isDumperType && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
            Bin Factor (BCM / load) <span className="text-accent-red">*</span>
          </label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            value={binFactor}
            onChange={(e) => setBinFactor(e.target.value)}
            placeholder="e.g. 25.5"
            className="bg-[var(--bg-secondary)] border-[var(--border-default)]"
            required
          />
          <p className="text-[var(--text-muted)] text-xs mt-1">
            Bank Cubic Meters per truckload — used for BCM/hour calculations.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
          Serial Number
        </label>
        <Input
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="e.g. HT-2024-003"
          className="bg-[var(--bg-secondary)] border-[var(--border-default)]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
          Department <span className="text-accent-red">*</span>
        </label>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          aria-label="Department"
          className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md text-[var(--text-heading)] text-sm focus:outline-none focus:border-[var(--accent-blue)]"
          required
        >
          <option value="">Select department…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.display_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
          Site
        </label>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          aria-label="Site"
          className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md text-[var(--text-heading)] text-sm focus:outline-none focus:border-[var(--accent-blue)]"
        >
          <option value="">No site assigned</option>
          {activeSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.site_code} — {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4 accent-[var(--accent-emerald)]"
        />
        <label
          htmlFor="active"
          className="text-sm font-medium text-[var(--text-body)]"
        >
          Active
        </label>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg border border-accent-amber/20 bg-accent-amber/5">
        <input
          type="checkbox"
          id="report_exempt"
          checked={reportExempt}
          onChange={(e) => setReportExempt(e.target.checked)}
          className="w-4 h-4 accent-amber-400"
        />
        <div>
          <label
            htmlFor="report_exempt"
            className="text-sm font-medium text-accent-amber cursor-pointer"
          >
            Exempt from shift reporting
          </label>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            When checked, control room users will not be required to log this
            machine before generating reports.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-[var(--accent-emerald)] hover:bg-[var(--accent-green)] text-[var(--bg-background)]"
        >
          {saving ? "Saving…" : machine ? "Update" : "Add Machine"}
        </Button>
      </div>
    </form>
  );
}
