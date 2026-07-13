"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/Button";
import { FormTextarea } from "@repo/ui/FormFields";
import { ShiftToggle } from "@repo/ui/ShiftToggle";
import { toast } from "sonner";
import { saveDailyLog } from "@/app/actions";

interface Machine {
  id: string;
  name: string;
  machine_type: string;
}

interface DailyLogFormProps {
  departmentId: string;
  departmentSlug: string;
  machines: Machine[];
}

export function DailyLogForm({ departmentId, machines }: DailyLogFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveDailyLog.bind(null, departmentId),
    null,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const [shiftValue, setShiftValue] = useState<"day" | "night">("day");

  useEffect(() => {
    if (state?.success) {
      toast.success("Daily log saved successfully");
      formRef.current?.reset();
      setShiftValue("day");
    } else if (state?.error) {
      toast.error("Failed to save daily log", {
        description: state.error,
      });
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {/* Shift selector */}
      <div className="space-y-2">
        <label
          htmlFor="shift-day"
          className="block text-sm text-[var(--text-muted)]"
        >
          Shift
        </label>
        <ShiftToggle
          value={shiftValue}
          onChange={(val) => setShiftValue(val as "day" | "night")}
          name="shift"
        />
        {/* Hidden input to ensure shift is submitted with FormData */}
        <input type="hidden" name="shift" value={shiftValue} />
      </div>

      {/* Machines list (read-only reference) */}
      {machines.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm text-[var(--text-muted)]">
            Machines
          </label>
          <div className="flex flex-wrap gap-2">
            {machines.map((m) => (
              <span
                key={m.id}
                className="px-3 py-1 rounded-full text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)]"
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <FormTextarea
        label="Notes"
        name="notes"
        rows={4}
        placeholder="Enter any observations or issues..."
        aria-label="Daily log notes"
      />

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          shape="pill"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save Daily Log"}
        </Button>

        {state?.success && (
          <span
            className="text-sm text-accent-green"
            role="status"
            aria-live="polite"
          >
            Log saved successfully.
          </span>
        )}
        {state?.error && (
          <span
            className="text-sm text-accent-red"
            role="alert"
            aria-live="assertive"
          >
            Failed to save log. Please try again.
          </span>
        )}
      </div>
    </form>
  );
}
