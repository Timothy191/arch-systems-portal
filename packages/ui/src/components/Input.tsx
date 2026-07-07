"use client";

import { cn } from "../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "login";
}

export function Input({
  variant = "default",
  className,
  ...props
}: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/20 transition-all duration-200",
        variant === "default"
          ? "border-[var(--border-emphasis)] bg-[var(--bg-secondary)]"
          : "border-[var(--border-emphasis)] bg-[var(--bg-tertiary)]",
        className,
      )}
      {...props}
    />
  );
}
