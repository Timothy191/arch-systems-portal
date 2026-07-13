"use client";

import { useState } from "react";
import { GlassCard } from "@repo/ui/GlassCard";
import { FormSelect, FormTextarea } from "@repo/ui/FormFields";
import { createBrowserSupabaseClient } from "@repo/supabase/client";
import { useRouter } from "next/navigation";
import { Wrench, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { colors } from "@repo/theme/tokens";

interface Machine {
  id: string;
  name: string;
  machine_type: string;
}

interface BreakdownDraft {
  id: string;
  fleet_id: string;
  machine_name: string | null;
  machine_type: string;
  reason: string;
  date_in: string;
  time_in: string;
  date_out: string | null;
  status: "active" | "completed";
}

interface EngineeringNotesFormProps {
  departmentId: string;
  machines: Machine[];
  breakdownDrafts?: BreakdownDraft[];
  initialShift?: "day" | "night";
}

const ISSUE_TYPES = [
  { value: "mechanical", label: "Mechanical", color: colors.issue.mechanical },
  { value: "electrical", label: "Electrical", color: colors.issue.electrical },
  { value: "structural", label: "Structural", color: colors.issue.structural },
  { value: "hydraulic", label: "Hydraulic", color: colors.issue.hydraulic },
  { value: "other", label: "Other", color: colors.issue.other },
];

const SEVERITY_LEVELS = [
  { value: "low", label: "Low", color: colors.severity.low },
  { value: "medium", label: "Medium", color: colors.severity.medium },
  { value: "high", label: "High", color: colors.severity.high },
  { value: "critical", label: "Critical", color: colors.severity.critical },
];

function inferIssueType(machineType: string): string {
  const t = machineType.toLowerCase();
  if (
    t.includes("electric") ||
    t.includes("switchgear") ||
    t.includes("transformer")
  )
    return "electrical";
  if (t.includes("hydraul")) return "hydraulic";
  return "mechanical";
}

function matchMachineId(
  machines: Machine[],
  machineName: string | null,
): string {
  if (!machineName) return "";
  const needle = machineName.toLowerCase();
  const match = machines.find(
    (m) =>
      m.name.toLowerCase() === needle ||
      m.name.toLowerCase().includes(needle) ||
      needle.includes(m.name.toLowerCase()),
  );
  return match?.id ?? "";
}

function getCurrentShift(): "day" | "night" {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
}

export function EngineeringNotesForm({
  departmentId,
  machines,
  breakdownDrafts = [],
  initialShift,
}: EngineeringNotesFormProps) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [formData, setFormData] = useState({
    issueType: "",
    severity: "",
    machineId: "",
    shiftType: initialShift ?? "day",
    description: "",
    actionTaken: "",
    requiresFollowUp: false,
  });

  const [isTemplatePreFilled, setIsTemplatePreFilled] = useState(false);
  const [draftsExpanded, setDraftsExpanded] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const prefillFromBreakdown = (bd: BreakdownDraft) => {
    setFormData({
      issueType: inferIssueType(bd.machine_type),
      severity: bd.status === "active" ? "high" : "medium",
      machineId: matchMachineId(machines, bd.machine_name),
      shiftType: getCurrentShift(),
      description: `[${bd.fleet_id}] ${bd.reason}`,
      actionTaken: "",
      requiresFollowUp: bd.status === "active",
    });
    setIsTemplatePreFilled(true);
    setDraftsExpanded(false);
    // Scroll form into view
    document
      .getElementById("eng-notes-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.issueType) {
      newErrors.issueType = "Select issue type";
    }
    if (!formData.severity) {
      newErrors.severity = "Select severity";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Enter description";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("engineering_notes").insert({
        department_id: departmentId,
        note_date: today,
        shift_type: formData.shiftType,
        issue_type: formData.issueType,
        severity: formData.severity,
        machine_id: formData.machineId || null,
        description: formData.description,
        action_taken: formData.actionTaken || null,
        requires_follow_up: formData.requiresFollowUp,
        status: "open",
      });

      if (error) throw error;

      // Clear form
      setFormData({
        issueType: "",
        severity: "",
        machineId: "",
        shiftType: getCurrentShift(),
        description: "",
        actionTaken: "",
        requiresFollowUp: false,
      });
      setIsTemplatePreFilled(false);

      router.refresh();
    } catch (err) {
      setErrors({ submit: "Failed to save. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Engineering Breakdowns Draft Panel */}
      {breakdownDrafts.length > 0 && (
        <GlassCard className="p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setDraftsExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-accent-amber shrink-0" />
              <span className="text-sm font-medium text-[var(--text-heading)]">
                Engineering Breakdowns
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
                {breakdownDrafts.length} active/today
              </span>
            </div>
            {draftsExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </button>

          {draftsExpanded && (
            <div className="divide-y divide-[var(--border-default)] border-t border-[var(--border-default)]">
              {breakdownDrafts.map((bd) => (
                <div
                  key={bd.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[var(--text-heading)]">
                        {bd.machine_name || bd.fleet_id}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        [{bd.fleet_id}]
                      </span>
                      {bd.status === "active" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">
                          <AlertTriangle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border bg-accent-green/10 border-accent-green/20 text-accent-green">
                          <span className="badge-pulse-dot bg-accent-green" />
                          Completed today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      {bd.reason}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {bd.machine_type} &middot; In: {bd.date_in} {bd.time_in}
                      {bd.date_out && ` → Out: ${bd.date_out}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => prefillFromBreakdown(bd)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/20 transition-colors"
                  >
                    Log Note →
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      <GlassCard>
        <form id="eng-notes-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-[var(--text-heading)]">
              Log Engineering Issue
            </h3>
            {isTemplatePreFilled && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
                  Template from Engineering
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      issueType: "",
                      severity: "",
                      machineId: "",
                      shiftType: getCurrentShift(),
                      description: "",
                      actionTaken: "",
                      requiresFollowUp: false,
                    });
                    setIsTemplatePreFilled(false);
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormSelect
              label="Issue Type"
              required
              name="issueType"
              value={formData.issueType}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  issueType: e.target.value,
                }))
              }
              options={ISSUE_TYPES}
              placeholder="Select type..."
              error={errors.issueType}
            />

            {/* Severity */}
            <FormSelect
              label="Severity"
              required
              name="severity"
              value={formData.severity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, severity: e.target.value }))
              }
              options={SEVERITY_LEVELS}
              placeholder="Select severity..."
              error={errors.severity}
            />

            {/* Machine (Optional) */}
            <FormSelect
              label="Affected Machine"
              optional
              name="machineId"
              value={formData.machineId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  machineId: e.target.value,
                }))
              }
              options={machines.map((m) => ({ value: m.id, label: m.name }))}
              placeholder="No specific machine"
            />
          </div>

          {/* Shift Type */}
          <div className="space-y-2">
            <label className="text-[var(--text-secondary)] text-sm block">
              Shift
            </label>
            <div className="flex gap-2 max-w-xs">
              {["day", "night"].map((shift) => (
                <button
                  key={shift}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      shiftType: shift as "day" | "night",
                    }))
                  }
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    formData.shiftType === shift
                      ? "bg-[var(--accent-cyan)] text-[var(--bg-secondary)]"
                      : "bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-heading)]"
                  }`}
                >
                  {shift.charAt(0).toUpperCase() + shift.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <FormTextarea
            label="Description"
            required
            name="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Describe the engineering issue..."
            rows={3}
            maxLength={500}
            error={errors.description}
          />

          {/* Action Taken */}
          <FormTextarea
            label="Action Taken"
            optional
            name="actionTaken"
            value={formData.actionTaken}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                actionTaken: e.target.value,
              }))
            }
            placeholder="What was done to address this issue?"
            rows={2}
            maxLength={300}
          />

          {/* Follow-up Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requiresFollowUp}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  requiresFollowUp: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--accent-cyan)] focus:ring-[var(--accent-cyan)]"
            />
            <span className="text-[var(--text-secondary)] text-sm">
              Requires follow-up
            </span>
          </label>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] text-[var(--bg-secondary)] font-medium py-2.5 px-6 rounded-lg transition-colors"
            >
              {isSubmitting ? "Saving..." : "Log Issue"}
            </button>
            {errors.submit && (
              <p className="text-accent-red text-sm">{errors.submit}</p>
            )}
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
