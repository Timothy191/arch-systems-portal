import { renderHook, act } from "@testing-library/react";
import { useDepartmentForm } from "./useDepartmentForm";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

// Mock @repo/supabase/client
jest.mock("@repo/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

describe("useDepartmentForm Hook", () => {
  const initialValues = {
    username: "",
    email: "",
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("should initialize form data with initial values", () => {
    const { result } = renderHook(() =>
      useDepartmentForm({
        initialValues,
        onSubmit: jest.fn(),
      }),
    );

    expect(result.current.formData).toEqual(initialValues);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should update form data via handleChange", () => {
    const { result } = renderHook(() =>
      useDepartmentForm({
        initialValues,
        onSubmit: jest.fn(),
      }),
    );

    act(() => {
      result.current.handleChange("username", "john_doe");
    });

    expect(result.current.formData.username).toBe("john_doe");
  });

  it("should validate before submit and block submission if invalid", async () => {
    const onSubmitMock = jest.fn();
    const validateMock = jest.fn(() => ({ username: "Username is required" }));

    const { result } = renderHook(() =>
      useDepartmentForm({
        initialValues,
        validate: validateMock,
        onSubmit: onSubmitMock,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(validateMock).toHaveBeenCalled();
    expect(onSubmitMock).not.toHaveBeenCalled();
    expect(result.current.errors.username).toBe("Username is required");
  });

  it("should submit and call onSubmit when valid", async () => {
    const onSubmitMock = jest.fn().mockResolvedValue(undefined);
    const validateMock = jest.fn(() => null);

    const { result } = renderHook(() =>
      useDepartmentForm({
        initialValues,
        validate: validateMock,
        onSubmit: onSubmitMock,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(validateMock).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });
});
