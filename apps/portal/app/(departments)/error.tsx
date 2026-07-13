"use client";

import { useEffect } from "react";
import { Button } from "@repo/ui/Button";
import { isAppError, isNotFoundError } from "@repo/errors";
import { logError } from "@/lib/errors/error-logger";

interface DepartmentErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

function getErrorTitle(error: Error): string {
  if (isNotFoundError(error)) return "Page not found";
  if (isAppError(error)) return error.name.replace(/([A-Z])/g, " $1").trim();
  return "Department Error";
}

function getErrorMessage(error: Error): string {
  if (isAppError(error)) return error.message;
  return error.message || "Failed to load department data.";
}

export default function DepartmentError({
  error,
  unstable_retry,
}: DepartmentErrorProps) {
  useEffect(() => {
    if (isAppError(error)) {
      logError(error);
    } else {
      logError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [error]);

  const title = getErrorTitle(error);
  const message = getErrorMessage(error);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-medium text-[var(--text-heading)]">
        {title}
      </h2>
      <p className="text-[var(--text-muted)] text-sm">{message}</p>
      {isAppError(error) && (
        <div className="text-xs text-[var(--text-muted)] font-mono">
          {error.code}
        </div>
      )}
      <Button
        variant="secondary"
        shape="pill"
        size="sm"
        onClick={() => unstable_retry()}
      >
        Try again
      </Button>
    </div>
  );
}
