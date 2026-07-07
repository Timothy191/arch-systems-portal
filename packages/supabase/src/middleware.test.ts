import { createMiddlewareClient } from "./middleware";

// Mock dependencies
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    next: jest.fn(),
  },
}));

describe("createMiddlewareClient", () => {
  const { createServerClient } = require("@supabase/ssr");
  const { NextRequest, NextResponse } = require("next/server");

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("should create middleware client with request cookies", () => {
    const mockRequest = {
      cookies: {
        getAll: jest.fn().mockReturnValue([
          { name: "sb-access-token", value: "token123" },
        ]),
        set: jest.fn(),
      },
    };

    const mockResponse = {
      cookies: {
        set: jest.fn(),
      },
    };

    NextResponse.next.mockReturnValue(mockResponse);
    NextRequest.mockImplementation(() => mockRequest);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    const result = createMiddlewareClient(mockRequest as never);

    expect(result.supabase).toBe(mockClient);
    expect(createServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );
  });

  it("should return response getter that returns supabase response", () => {
    const mockRequest = {
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    };

    const mockResponse = {
      cookies: {
        set: jest.fn(),
      },
    };

    NextResponse.next.mockReturnValue(mockResponse);
    NextRequest.mockImplementation(() => mockRequest);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    const result = createMiddlewareClient(mockRequest as never);

    expect(result.response).toBe(mockResponse);
  });

  it("should configure getAll to return request cookies", () => {
    const mockCookies = [
      { name: "sb-access-token", value: "token123" },
      { name: "sb-refresh-token", value: "refresh456" },
    ];
    const mockRequest = {
      cookies: {
        getAll: jest.fn().mockReturnValue(mockCookies),
        set: jest.fn(),
      },
    };

    const mockResponse = {
      cookies: {
        set: jest.fn(),
      },
    };

    NextResponse.next.mockReturnValue(mockResponse);
    NextRequest.mockImplementation(() => mockRequest);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    createMiddlewareClient(mockRequest as never);

    const cookieConfig = createServerClient.mock.calls[0][2].cookies;
    const result = cookieConfig.getAll();

    expect(result).toEqual(mockCookies);
  });

  it("should configure setAll to set cookies on request and response", () => {
    const mockRequest = {
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    };

    const mockResponse = {
      cookies: {
        set: jest.fn(),
      },
    };

    NextResponse.next.mockReturnValue(mockResponse);
    NextRequest.mockImplementation(() => mockRequest);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    createMiddlewareClient(mockRequest as never);

    const cookieConfig = createServerClient.mock.calls[0][2].cookies;
    const cookiesToSet = [
      { name: "sb-access-token", value: "new-token", options: {} },
    ];

    cookieConfig.setAll(cookiesToSet);

    expect(mockRequest.cookies.set).toHaveBeenCalledWith(
      "sb-access-token",
      "new-token",
    );
    expect(mockResponse.cookies.set).toHaveBeenCalled();
  });

  it("should set security options on response cookies", () => {
    const mockRequest = {
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    };

    const mockResponse = {
      cookies: {
        set: jest.fn(),
      },
    };

    NextResponse.next.mockReturnValue(mockResponse);
    NextRequest.mockImplementation(() => mockRequest);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    process.env.NODE_ENV = "production";

    createMiddlewareClient(mockRequest as never);

    const cookieConfig = createServerClient.mock.calls[0][2].cookies;
    const cookiesToSet = [
      { name: "sb-access-token", value: "new-token", options: {} },
    ];

    cookieConfig.setAll(cookiesToSet);

    const setCall = mockResponse.cookies.set.mock.calls[0];
    expect(setCall[2]).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  });

  it("should use secure: false in development environment", () => {
    const mockRequest = {
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    };

    const mockResponse = {
      cookies: {
        set: jest.fn(),
      },
    };

    NextResponse.next.mockReturnValue(mockResponse);
    NextRequest.mockImplementation(() => mockRequest);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    process.env.NODE_ENV = "development";

    createMiddlewareClient(mockRequest as never);

    const cookieConfig = createServerClient.mock.calls[0][2].cookies;
    const cookiesToSet = [
      { name: "sb-access-token", value: "new-token", options: {} },
    ];

    cookieConfig.setAll(cookiesToSet);

    const setCall = mockResponse.cookies.set.mock.calls[0];
    expect(setCall[2]).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
  });

  it("should remove maxAge and expires from cookie options", () => {
    const mockRequest = {
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    };

    const mockResponse = {
      cookies: {
        set: jest.fn(),
      },
    };

    NextResponse.next.mockReturnValue(mockResponse);
    NextRequest.mockImplementation(() => mockRequest);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    createMiddlewareClient(mockRequest as never);

    const cookieConfig = createServerClient.mock.calls[0][2].cookies;
    const cookiesToSet = [
      {
        name: "sb-access-token",
        value: "new-token",
        options: { maxAge: 3600, expires: new Date() },
      },
    ];

    cookieConfig.setAll(cookiesToSet);

    const setCall = mockResponse.cookies.set.mock.calls[0];
    expect(setCall[2].maxAge).toBeUndefined();
    expect(setCall[2].expires).toBeUndefined();
  });

  it("should handle multiple cookies in setAll", () => {
    const mockRequest = {
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    };

    const mockResponse = {
      cookies: {
        set: jest.fn(),
      },
    };

    NextResponse.next.mockReturnValue(mockResponse);
    NextRequest.mockImplementation(() => mockRequest);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    createMiddlewareClient(mockRequest as never);

    const cookieConfig = createServerClient.mock.calls[0][2].cookies;
    const cookiesToSet = [
      { name: "sb-access-token", value: "token1", options: {} },
      { name: "sb-refresh-token", value: "token2", options: {} },
    ];

    cookieConfig.setAll(cookiesToSet);

    expect(mockRequest.cookies.set).toHaveBeenCalledTimes(2);
    expect(mockResponse.cookies.set).toHaveBeenCalledTimes(2);
  });

  it("should create new NextResponse for each setAll call", () => {
    const mockRequest = {
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    };

    const mockResponse = {
      cookies: {
        set: jest.fn(),
      },
    };

    NextResponse.next.mockReturnValue(mockResponse);
    NextRequest.mockImplementation(() => mockRequest);

    const mockClient = { auth: {} };
    createServerClient.mockReturnValue(mockClient);

    createMiddlewareClient(mockRequest as never);

    const cookieConfig = createServerClient.mock.calls[0][2].cookies;
    const cookiesToSet = [{ name: "test", value: "value", options: {} }];

    cookieConfig.setAll(cookiesToSet);

    expect(NextResponse.next).toHaveBeenCalledTimes(2);
  });
});
