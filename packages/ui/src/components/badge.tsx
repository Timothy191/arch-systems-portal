import * as React from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

const variants: Record<BadgeVariant, string> = {
  default: "bg-gray-800 text-gray-300",
  success: "bg-emerald-900/40 text-emerald-400 border border-emerald-800",
  warning: "bg-amber-900/40 text-amber-400 border border-amber-800",
  error: "bg-red-900/40 text-red-400 border border-red-800",
  info: "bg-sky-900/40 text-sky-400 border border-sky-800",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = "default",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
