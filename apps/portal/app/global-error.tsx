"use client";

import { useEffect } from "react";
import "@repo/ui/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in development; Sentry is initialized via instrumentation.ts
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Global error:", error);
    }
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 antialiased text-[var(--text-heading)]">
        <div className="max-w-md w-full text-center space-y-6 bg-white/70 backdrop-blur-lg border border-black/[0.08] shadow-window rounded-xl p-8">
          <div className="flex justify-center">
            {/* Standard img tag instead of next/image to ensure absolute boot resilience */}
            <img
              src="/404-error.png"
              alt="System Error"
              className="w-[120px] h-[120px] opacity-80"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-medium text-[var(--text-heading)] tracking-tight">
              System Error
            </h1>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              {error?.message || "A critical boot-level error occurred."}
            </p>
          </div>
          {error?.digest && (
            <div className="text-xs text-[var(--text-muted)] font-mono bg-black/[0.02] border border-black/[0.04] rounded p-2 select-all">
              Digest ID: {error.digest}
            </div>
          )}
          <button
            onClick={reset}
            className="px-4 py-2 bg-[var(--accent-blue)] text-white font-medium rounded-lg text-sm transition-all duration-200 hover:bg-[var(--accent-blue)]/90 active:scale-[0.98]"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
