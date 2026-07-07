import { instrumentedFetch, createServerSupabaseClient, getUserSafely } from "./server";
import type { User } from "@supabase/supabase-js";

// Mock dependencies
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("instrumentedFetch", () => {
  let originalFetch: typeof global.fetch;
  let mockRecordDbQuery: jest.Mock;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockRecordDbQuery = jest.fn();
    (globalThis as unknown as Record<string, unknown>).__recordDbQuery = mockRecordDbQuery;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete (globalThis as unknown as Record<string, unknown>).__recordDbQuery;
  });

  it("should call fetch and return response on success", async () => {
    const mockResponse = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const result = await instrumentedFetch("https://example.com");

    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith("https://example.com", undefined);
  });

  it("should call fetch with init options when provided", async () => {
    const mockResponse = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    const init = { method: "POST" };

    await instrumentedFetch("https://example.com", init);

    expect(global.fetch).toHaveBeenCalledWith("https://example.com", init);
  });

  it("should record query metrics when __recordDbQuery is defined", async () => {
    const mockResponse = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await instrumentedFetch("https://example.supabase.co/rest/v1/users");

    expect(mockRecordDbQuery).toHaveBeenCalledWith(
      "users",
      "GET",
      expect.any(Number),
      true,
    );
  });

  it("should extract table name from URL with v1 path", async () => {
    const mockResponse = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await instrumentedFetch("https://example.supabase.co/rest/v1/posts?select=*");

    expect(mockRecordDbQuery).toHaveBeenCalledWith(
      "posts",
      "GET",
      expect.any(Number),
      true,
    );
  });

  it("should use 'unknown' as table name when URL parsing fails", async () => {
    const mockResponse = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await instrumentedFetch("https://example.com/not-a-supabase-url");

    expect(mockRecordDbQuery).toHaveBeenCalledWith(
      "unknown",
      "GET",
      expect.any(Number),
      true,
    );
  });

  it("should use 'unknown' as table name when URL has no v1 segment", async () => {
    const mockResponse = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await instrumentedFetch("https://example.supabase.co/rest/v2/users");

    expect(mockRecordDbQuery).toHaveBeenCalledWith(
      "unknown",
      "GET",
      expect.any(Number),
      true,
    );
  });

  it("should record failure when response is not ok", async () => {
    const mockResponse = { ok: false } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await instrumentedFetch("https://example.supabase.co/rest/v1/users");

    expect(mockRecordDbQuery).toHaveBeenCalledWith(
      "users",
      "GET",
      expect.any(Number),
      false,
    );
  });

  it("should handle fetch errors gracefully and still record metrics", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    await expect(
      instrumentedFetch("https://example.supabase.co/rest/v1/users"),
    ).rejects.toThrow("Network error");

    expect(mockRecordDbQuery).toHaveBeenCalledWith(
      "users",
      "GET",
      expect.any(Number),
      false,
    );
  });

  it("should use POST method from init options", async () => {
    const mockResponse = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await instrumentedFetch("https://example.supabase.co/rest/v1/users", {
      method: "POST",
    });

    expect(mockRecordDbQuery).toHaveBeenCalledWith(
      "users",
      "POST",
      expect.any(Number),
      true,
    );
  });

  it("should handle URL input as Request object", async () => {
    const mockResponse = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    const request = new Request("https://example.supabase.co/rest/v1/posts");

    await instrumentedFetch(request);

    expect(mockRecordDbQuery).toHaveBeenCalledWith(
      "posts",
      "GET",
      expect.any(Number),
      true,
    );
  });

  it("should handle URL input as URL object", async () => {
    const mockResponse = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    const url = new URL("https://example.supabase.co/rest/v1/comments");

    await instrumentedFetch(url);

    expect(mockRecordDbQuery).toHaveBeenCalledWith(
      "comments",
      "GET",
      expect.any(Number),
      true,
    );
  });
});

describe("createServerSupabaseClient", () => {
  const { createServerClient } = require("@supabase/ssr");
  const { cookies } = require("next/headers");

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("should create server client with environment variables", async () => {
    const mockCookieStore = {
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    };
    cookies.mockResolvedValue(mockCookieStore);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    await createServerSupabaseClient();

    expect(cookies).toHaveBeenCalled();
    expect(createServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        global: {
          fetch: instrumentedFetch,
        },
      }),
    );
  });

  it("should use instrumentedFetch as global fetch", async () => {
    const mockCookieStore = {
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    };
    cookies.mockResolvedValue(mockCookieStore);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    await createServerSupabaseClient();

    const callOptions = createServerClient.mock.calls[0][2];
    expect(callOptions.global.fetch).toBe(instrumentedFetch);
  });

  it("should configure cookie handlers", async () => {
    const mockCookieStore = {
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    };
    cookies.mockResolvedValue(mockCookieStore);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    await createServerSupabaseClient();

    const callOptions = createServerClient.mock.calls[0][2];
    expect(callOptions.cookies).toBeDefined();
    expect(typeof callOptions.cookies.getAll).toBe("function");
    expect(typeof callOptions.cookies.setAll).toBe("function");
  });

  it("should handle cookie setAll errors gracefully", async () => {
    const mockCookieStore = {
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn().mockImplementation(() => {
        throw new Error("Server component context");
      }),
    };
    cookies.mockResolvedValue(mockCookieStore);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    const callOptions = createServerClient.mock.calls[0][2];
    const cookiesToSet = [{ name: "test", value: "value", options: {} }];

    expect(() => {
      callOptions.cookies.setAll(cookiesToSet);
    }).not.toThrow();
  });
});

describe("getUserSafely", () => {
  it("should return user when auth succeeds", async () => {
    const mockUser: User = {
      id: "user-123",
      email: "test@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };

    const result = await getUserSafely(mockSupabase as never);

    expect(result).toEqual(mockUser);
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  });

  it("should return null when user is not authenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };

    const result = await getUserSafely(mockSupabase as never);

    expect(result).toBeNull();
  });

  it("should return null when refresh token error occurs", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockRejectedValue(
          new Error("AuthApiError: Invalid Refresh Token"),
        ),
      },
    };

    const result = await getUserSafely(mockSupabase as never);

    expect(result).toBeNull();
  });

  it("should return null for any auth error", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockRejectedValue(new Error("Any auth error")),
      },
    };

    const result = await getUserSafely(mockSupabase as never);

    expect(result).toBeNull();
  });

  it("should handle network errors gracefully", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockRejectedValue(new Error("Network error")),
      },
    };

    const result = await getUserSafely(mockSupabase as never);

    expect(result).toBeNull();
  });
});
