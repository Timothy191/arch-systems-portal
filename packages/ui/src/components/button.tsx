import * as React from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-sky-600 text-white hover:bg-sky-500 focus-visible:ring-sky-500",
  secondary:
    "bg-gray-800 text-gray-100 hover:bg-gray-700 focus-visible:ring-gray-600",
  ghost:
    "bg-transparent text-gray-300 hover:bg-gray-800 focus-visible:ring-gray-600",
  destructive:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-lg font-semibold",
          "transition-colors focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
