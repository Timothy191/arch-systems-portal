"use client";

import { useState } from "react";

export function useFormSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return { isSubmitting, setIsSubmitting, error, setError };
}