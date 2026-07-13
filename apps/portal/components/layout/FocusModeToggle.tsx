"use client";

import { useFocusMode } from "@/hooks/useFocusMode";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

interface FocusModeToggleProps {
  className?: string;
  variant?: "default" | "icon";
}

export function FocusModeToggle({
  className,
  variant = "default",
}: FocusModeToggleProps) {
  const { enabled, toggle } = useFocusMode();

  if (variant === "icon") {
    return (
      <button
        onClick={toggle}
        className={cn(
          "relative inline-flex h-[44px] w-[44px] items-center justify-center rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50",
          enabled ? "bg-accent-blue" : "bg-black/[0.15] hover:bg-black/[0.20]",
          className,
        )}
        aria-pressed={enabled}
        title={enabled ? "Exit Focus Mode" : "Enter Focus Mode"}
      >
        <span
          className={cn(
            "relative h-[22px] w-[44px] rounded-full transition-colors duration-200 ease-out flex items-center justify-center",
            enabled ? "bg-white/20" : "bg-transparent",
          )}
        >
          <span
            className={cn(
              "absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-card transition-transform duration-200 ease-out flex items-center justify-center",
              enabled ? "translate-x-[22px]" : "translate-x-0",
            )}
          >
            {enabled ? (
              <EyeOff className="w-2.5 h-2.5 text-accent-blue" />
            ) : (
              <Eye className="w-2.5 h-2.5 text-[var(--text-muted)]" />
            )}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
        "border backdrop-blur-md",
        enabled
          ? "bg-accent-amber/10 border-accent-amber/20 text-accent-amber hover:bg-accent-amber/20"
          : "bg-arch-surface-tertiary/50 border-arch-border-subtle text-arch-text-tertiary hover:text-arch-text-primary hover:bg-arch-surface-tertiary",
        className,
      )}
      aria-pressed={enabled}
      title={enabled ? "Exit Focus Mode" : "Enter Focus Mode"}
    >
      {enabled ? (
        <>
          <EyeOff className="w-3.5 h-3.5" />
          Focused
        </>
      ) : (
        <>
          <Eye className="w-3.5 h-3.5" />
          Focus Mode
        </>
      )}
    </button>
  );
}
