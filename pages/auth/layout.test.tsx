/* eslint-disable no-console */
import { render } from "@testing-library/react";
import AuthLayout from "./layout";

// Mock cookies — no auth cookies by default, so the redirect path is not taken.
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    getAll: jest.fn(() => []),
  })),
}));

// Mock redirect so the authed path can be tested without actually navigating.
const mockRedirect = jest.fn();
jest.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    // Mimic the real behaviour: next/navigation's redirect throws a sentinel
    // that the framework catches. We surface it so the rest of the layout body
    // does not run, matching what happens in production.
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

// Mutable mocks for the supabase helpers — tests can override behaviour.
const mockGetUserSafely = jest.fn();
jest.mock("@repo/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
  getUserSafely: (...args: unknown[]) => mockGetUserSafely(...args),
}));

describe("AuthLayout", () => {
  let originalConsoleError: typeof console.error;

  beforeAll(() => {
    originalConsoleError = console.error;
  });

  beforeEach(() => {
    mockRedirect.mockClear();
    mockGetUserSafely.mockReset();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("renders children correctly when no auth cookie is present", async () => {
    const layout = await AuthLayout({ children: <div>Test Child</div> });
    render(layout);

    expect(mockGetUserSafely).not.toHaveBeenCalled();
  });

  it("applies container layout classes", async () => {
    const layout = await AuthLayout({ children: <div>Test Child</div> });
    const { container } = render(layout);

    const outerContainer = container.firstChild;
    expect(outerContainer).toHaveClass("relative");
    expect(outerContainer).toHaveClass("min-h-[calc(100vh-28px)]");
    expect(outerContainer).toHaveClass("w-full");
    expect(outerContainer).toHaveClass("h-full");
    expect(outerContainer).toHaveClass("flex");
    expect(outerContainer).toHaveClass("overflow-hidden");
  });

  it("unmounts cleanly without side effects", async () => {
    const layout = await AuthLayout({ children: <div>Test Child</div> });
    const { unmount } = render(layout);
    expect(() => unmount()).not.toThrow();
  });

  describe("redirect-if-authed (defense-in-depth)", () => {
    // Override the cookies mock for these tests so an auth cookie is reported.
    let cookieOverride: jest.Mock;
    beforeEach(() => {
      cookieOverride = jest.fn(async () => ({
        getAll: jest.fn(() => [
          { name: "sb-example-auth-token", value: "present" },
        ]),
      }));
      const { cookies } = require("next/headers");
      cookies.mockImplementation(cookieOverride);
    });

    afterEach(() => {
      const { cookies } = require("next/headers");
      cookies.mockImplementation(async () => ({ getAll: () => [] }));
    });

    it("redirects to / when an auth cookie is present and the user resolves", async () => {
      mockGetUserSafely.mockResolvedValue({ id: "user-1" });

      await expect(
        AuthLayout({ children: <div>Test Child</div> }),
      ).rejects.toThrow("NEXT_REDIRECT:/");

      expect(mockGetUserSafely).toHaveBeenCalledTimes(1);
    });

    it("renders children when the auth cookie is present but getUserSafely returns null (e.g. expired token)", async () => {
      mockGetUserSafely.mockResolvedValue(null);

      const layout = await AuthLayout({ children: <div>Test Child</div> });
      const { getByText } = render(layout);

      expect(getByText("Test Child")).toBeInTheDocument();
      expect(mockGetUserSafely).toHaveBeenCalledTimes(1);
    });
  });
});
