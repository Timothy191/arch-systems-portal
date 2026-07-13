"use client";

import { useState } from "react";
import { GlassCard } from "@repo/ui/GlassCard";
import { FormSelect, FormInput, FormTextarea } from "@repo/ui/FormFields";
import { createBrowserSupabaseClient } from "@repo/supabase/client";
import { useRouter } from "next/navigation";

interface Machine {
  id: string;
  name: string;
}

interface DelayCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface OperationalDelaysFormProps {
  departmentId: string;
  machines: Machine[];
  categories: DelayCategory[];
  initialShift?: "day" | "night";
}

const DELAY_TYPES = [
  { value: "equipment", label: "Equipment" },
  { value: "weather", label: "Weather" },
  { value: "safety", label: "Safety" },
  { value: "material", label: "Material" },
  { value: "shift_change", label: "Shift Change" },
  { value: "operator", label: "Operator" },
  { value: "other", label: "Other" },
];

// Template buttons for quick entry
const TEMPLATES = [
  {
    label: "Equipment Break",
    type: "equipment",
    category: "Equipment Breakdown",
    minutes: 30,
  },
  { label: "Rain Stop", type: "weather", category: "Weather", minutes: 60 },
  {
    label: "Safety Stop",
    type: "safety",
    category: "Safety Incident",
    minutes: 15,
  },
  {
    label: "Shift Handover",
    type: "shift_change",
    category: "Shift Change",
    minutes: 15,
  },
];

export function OperationalDelaysForm({
  departmentId,
  machines,
  categories,
  initialShift,
}: OperationalDelaysFormProps) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const getCurrentShift = (): "day" | "night" => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? "day" : "night";
  };

  const [formData, setFormData] = useState({
    delayType: "",
    categoryId: "",
    affectedMachineId: "",
    delayMinutes: "",
    description: "",
    impactDescription: "",
    recoveryAction: "",
    shiftType: initialShift ?? "day",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTemplateClick = (template: (typeof TEMPLATES)[0]) => {
    const category = categories.find((c) => c.name === template.category);
    setFormData((prev) => ({
      ...prev,
      delayType: template.type,
      categoryId: category?.id || "",
      delayMinutes: template.minutes.toString(),
      description: template.label,
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.delayType) {
      newErrors.delayType = "Select delay type";
    }

    if (!formData.delayMinutes) {
      newErrors.delayMinutes = "Enter delay duration";
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

      const { error } = await supabase.from("operational_delays").insert({
        department_id: departmentId,
        delay_date: today,
        shift_type: formData.shiftType,
        delay_category_id: formData.categoryId || null,
        delay_type: formData.delayType,
        affected_machine_id: formData.affectedMachineId || null,
        delay_minutes: parseInt(formData.delayMinutes, 10),
        description: formData.description,
        impact_description: formData.impactDescription || null,
        recovery_action: formData.recoveryAction || null,
        status: "active",
      });

      if (error) throw error;

      // Clear form
      setFormData({
        delayType: "",
        categoryId: "",
        affectedMachineId: "",
        delayMinutes: "",
        description: "",
        impactDescription: "",
        recoveryAction: "",
        shiftType: getCurrentShift(),
      });

      router.refresh();
    } catch (err) {
      setErrors({ submit: "Failed to save. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-lg font-medium text-[var(--text-heading)]">
          Log Operational Delay
        </h3>

        {/* Template Buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[var(--text-muted)] text-sm mr-2 py-2">
            Quick:
          </span>
          {TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => handleTemplateClick(template)}
              className="px-3 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-secondary)] text-sm transition-colors"
            >
              {template.label}
            </button>
          ))}
        </div>

        {/* Delay Type & Shift */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            label="Delay Type"
            required
            name="delayType"
            value={formData.delayType}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, delayType: e.target.value }))
            }
            options={DELAY_TYPES}
            placeholder="Select type..."
            error={errors.delayType}
          />

          <div className="space-y-2">
            <label className="text-[var(--text-secondary)] text-sm block">
              Shift
            </label>
            <div className="flex gap-2">
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
        </div>

        {/* Category & Machine */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            label="Category"
            optional
            name="categoryId"
            value={formData.categoryId}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, categoryId: e.target.value }))
            }
            options={categories.map((cat) => ({
              value: cat.id,
              label: cat.name,
            }))}
            placeholder="Select category..."
          />

          <FormSelect
            label="Affected Machine"
            optional
            name="affectedMachineId"
            value={formData.affectedMachineId}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                affectedMachineId: e.target.value,
              }))
            }
            options={machines.map((m) => ({ value: m.id, label: m.name }))}
            placeholder="No specific machine"
          />
        </div>

        {/* Delay Minutes */}
        <FormInput
          label="Duration"
          required
          name="delayMinutes"
          type="number"
          min={1}
          max={720}
          value={formData.delayMinutes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, delayMinutes: e.target.value }))
          }
          placeholder="Minutes"
          error={errors.delayMinutes}
        />

        {/* Description */}
        <FormTextarea
          label="Description"
          required
          name="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Describe the delay..."
          rows={3}
          maxLength={300}
          error={errors.description}
        />

        {/* Impact */}
        <FormTextarea
          label="Impact"
          optional
          name="impactDescription"
          value={formData.impactDescription}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              impactDescription: e.target.value,
            }))
          }
          placeholder="Impact on production/plan..."
          rows={2}
          maxLength={200}
        />

        {/* Recovery Action */}
        <FormTextarea
          label="Recovery Action"
          optional
          name="recoveryAction"
          value={formData.recoveryAction}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              recoveryAction: e.target.value,
            }))
          }
          placeholder="How was the delay resolved?"
          rows={2}
          maxLength={200}
        />

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] text-[var(--bg-secondary)] font-medium py-2.5 px-6 rounded-lg transition-colors"
          >
            {isSubmitting ? "Saving..." : "Log Delay"}
          </button>
          {errors.submit && (
            <p className="text-accent-red text-sm">{errors.submit}</p>
          )}
        </div>
      </form>
    </GlassCard>
  );
}
