"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type Props = {
  fallback: ReactNode;
  children: ReactNode;
};

export default function SuspenseOnSearchParams({ fallback, children }: Props) {
  const searchParams = useSearchParams();
  return (
    <Suspense key={searchParams.toString()} fallback={fallback}>
      {children}
    </Suspense>
  );
}
