import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@repo/supabase/client";

interface UseDepartmentFormOptions<T> {
  storageKey?: string;
  initialValues: T;
  validate?: (_values: T) => Record<string, string> | null;
  onSubmit: (_values: T, _supabase: any) => Promise<void>;
  onSuccess?: () => void;
}

export function useDepartmentForm<T>({
  storageKey,
  initialValues,
  validate,
  onSubmit,
  onSuccess,
}: UseDepartmentFormOptions<T>) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [formData, setFormData] = useState<T>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setFormData(JSON.parse(saved));
      }
    } catch (e) {
      // Ignored
    }
  }, [storageKey]);

  // Save draft periodically
  useEffect(() => {
    if (!storageKey) return;
    const interval = setInterval(() => {
      if (JSON.stringify(formData) !== JSON.stringify(initialValues)) {
        localStorage.setItem(storageKey, JSON.stringify(formData));
        setLastSaved(new Date());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [storageKey, formData, initialValues]);

  const handleChange = useCallback((key: keyof T, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    setErrors((prev) => {
      if (prev[key as string]) {
        const next = { ...prev };
        delete next[key as string];
        return next;
      }
      return prev;
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
    setError(null);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [initialValues, storageKey]);

  const handleSubmit = useCallback(
    async (e?: React.Formevent) => {
      if (e) e.preventDefault();
      setError(null);
      setErrors({});

      if (validate) {
        const validationErrors = validate(formData);
        if (validationErrors && Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      setIsSubmitting(true);
      try {
        await onSubmit(formData, supabase);
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }
        router.refresh();
        if (onSuccess) onSuccess();
      } catch (err: any) {
        setError(
          err?.message || "An unexpected error occurred. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, onSubmit, supabase, storageKey, router, onSuccess],
  );

  return {
    formData,
    setFormData,
    handleChange,
    isSubmitting,
    error,
    setError,
    errors,
    setErrors,
    lastSaved,
    resetForm,
    handleSubmit,
    supabase,
  };
}
