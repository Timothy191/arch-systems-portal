/**
 * @jest-environment node
 */
import {
  logout,
  speculativeEmbedShiftLog,
  generateMonthlyReport,
} from "./actions";

jest.mock("@repo/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock("@react-pdf/renderer", () => {
  const React = require("react");
  const createMockComponent = (name: string) => {
    const MockComp = (props: any) =>
      React.createElement(name, props, props.children);
    MockComp.displayName = name;
    return MockComp;
  };
  return {
    pdf: jest.fn().mockImplementation(() => ({
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("mock-pdf-content")),
    })),
    StyleSheet: {
      create: jest.fn().mockImplementation((styles) => styles),
    },
    Document: createMockComponent("Document"),
    Page: createMockComponent("Page"),
    Text: createMockComponent("Text"),
    View: createMockComponent("View"),
  };
});

jest.mock("next/navigation", () => ({
  redirect: jest.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

jest.mock("@repo/utils/inngest", () => ({
  inngest: {
    send: jest.fn().mockResolvedValue({}),
  },
  aiGenerateEmbeddingEvent: "ai/generate-embedding",
}));

const { createServerSupabaseClient } = jest.requireMock(
  "@repo/supabase/server",
);

const { inngest } = jest.requireMock("@repo/utils/inngest");

describe("actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("logout", () => {
    it("calls signOut and redirects to /login", async () => {
      const signOut = jest.fn().mockResolvedValue({});
      createServerSupabaseClient.mockResolvedValue({ auth: { signOut } });

      await expect(logout()).rejects.toThrow("NEXT_REDIRECT");
      expect(signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe("speculativeEmbedShiftLog", () => {
    it("throws error if user is not authenticated", async () => {
      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      });

      await expect(
        speculativeEmbedShiftLog("test shift log note"),
      ).rejects.toThrow("Unauthorized");
      expect(inngest.send).not.toHaveBeenCalled();
    });

    it("does not generate embedding if text is empty", async () => {
      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
          }),
        },
      });

      await speculativeEmbedShiftLog("");
      expect(inngest.send).not.toHaveBeenCalled();
    });

    it("generates embedding for valid text when user is authenticated", async () => {
      const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any);

      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
          }),
          getSession: jest.fn().mockResolvedValue({
            data: { session: { access_token: "token-123" } },
          }),
        },
      });

      await speculativeEmbedShiftLog("valid log entry");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/jobs/embeddings"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ text: "valid log entry" }),
        }),
      );
      mockFetch.mockRestore();
    });
  });

  describe("generateMonthlyReport", () => {
    it("throws error if user is not authenticated", async () => {
      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
          getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        },
      });

      await expect(generateMonthlyReport({ title: "Test" })).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("throws error if user is not admin or manager", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: "operator", department_id: "dept-1" },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
          }),
          getSession: jest.fn().mockResolvedValue({
            data: { session: { access_token: "token-123" } },
          }),
        },
        from: jest.fn().mockReturnValue({ select: mockSelect }),
      } as any);

      await expect(generateMonthlyReport({ title: "Test" })).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("generates report and returns signed URL for authorized users", async () => {
      const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue({ success: true, url: "http://signed-url" }),
      } as any);

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: "admin", department_id: "dept-1" },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
          }),
          getSession: jest.fn().mockResolvedValue({
            data: { session: { access_token: "token-123" } },
          }),
        },
        from: jest.fn().mockReturnValue({ select: mockSelect }),
      } as any);

      const res = await generateMonthlyReport({ title: "Test" }, "dept-1");
      expect(res.success).toBe(true);
      expect(res.url).toBe("http://signed-url");
      mockFetch.mockRestore();
    });
  });
});
