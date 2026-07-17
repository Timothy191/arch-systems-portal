"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Portal] Unhandled error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-center text-sm text-gray-400">
        {error.message ?? "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold transition hover:bg-sky-500"
      >
        Try again
      </button>
    </main>
  );
}
