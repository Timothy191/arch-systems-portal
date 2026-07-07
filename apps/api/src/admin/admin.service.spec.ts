import { Test, TestingModule } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

describe("AdminService", () => {
  let service: AdminService;
  let mockSupabase: any;

  function makeThenable(value: any) {
    const chain: any = {
      then(resolve: Function) {
        return resolve(value);
      },
    };
    chain.select = () => chain;
    chain.order = () => chain;
    chain.range = () => chain;
    chain.eq = () => chain;
    chain.single = () => chain;
    chain.insert = () => chain;
    chain.update = () => chain;
    chain.delete = () => chain;
    return chain;
  }

  beforeEach(async () => {
    mockSupabase = {
      from: jest
        .fn()
        .mockImplementation((table: string) =>
          makeThenable({ data: [], error: null, count: 0 }),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: SUPABASE_CLIENT, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // ── validateTable ─────────────────────────────────────────────────────

  describe("validateTable", () => {
    it("should return normalized table name for known tables", () => {
      expect(service.validateTable("MACHINES")).toBe("machines");
      expect(service.validateTable("Daily_Logs")).toBe("daily_logs");
      expect(service.validateTable("safety_incidents")).toBe(
        "safety_incidents",
      );
    });

    it("should throw NotFoundException for unknown tables", () => {
      expect(() => service.validateTable("secret_data")).toThrow(
        NotFoundException,
      );
      expect(() => service.validateTable("users")).toThrow(NotFoundException);
    });
  });

  // ── assertAdmin ───────────────────────────────────────────────────────

  describe("assertAdmin", () => {
    it("should return employee when user is admin", async () => {
      mockSupabase.from.mockImplementation(() =>
        makeThenable({
          data: { id: "emp-1", role: "admin" },
          error: null,
        }),
      );

      const result = await service.assertAdmin("auth-user-1");
      expect(result.role).toBe("admin");
    });

    it("should throw ForbiddenException when user is not an admin", async () => {
      mockSupabase.from.mockImplementation(() =>
        makeThenable({
          data: { id: "emp-2", role: "operator" },
          error: null,
        }),
      );

      await expect(service.assertAdmin("auth-user-2")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw ForbiddenException when employee not found", async () => {
      mockSupabase.from.mockImplementation(() =>
        makeThenable({
          data: null,
          error: { message: "Not found" },
        }),
      );

      await expect(service.assertAdmin("unknown")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── getData ───────────────────────────────────────────────────────────

  describe("getData", () => {
    it("should return paginated data from a valid table", async () => {
      const mockData = [{ id: "1" }, { id: "2" }];
      mockSupabase.from.mockImplementation(() =>
        makeThenable({ data: mockData, error: null, count: 2 }),
      );

      const result = await service.getData("machines", 10, 0, "name", "asc");
      expect(result.data).toEqual(mockData);
      expect(result.count).toBe(2);
      expect(result.limit).toBe(10);
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockImplementation(() =>
        makeThenable({ data: null, error: { message: "Connection failed" } }),
      );

      await expect(
        service.getData("machines", 10, 0, "name", "asc"),
      ).rejects.toThrow("Database query failed");
    });
  });

  // ── updateData ────────────────────────────────────────────────────────

  describe("updateData", () => {
    const validBody = { id: "record-1", data: { name: "New Name" } };

    it("should update data and create audit log for admin", async () => {
      const beforeData = { id: "record-1", name: "Old Name" };

      // First call: get before state; Second call: update; Third call: audit insert
      const mockFrom = jest.fn();
      mockSupabase.from = mockFrom;

      // Before state
      mockFrom.mockImplementationOnce(() =>
        makeThenable({ data: beforeData, error: null }),
      );
      // Update
      mockFrom.mockImplementationOnce(() =>
        makeThenable({ data: null, error: null }),
      );
      // Audit insert
      mockFrom.mockImplementationOnce(() =>
        makeThenable({ data: null, error: null }),
      );

      const result = await service.updateData("machines", validBody, "emp-1");

      expect(result).toEqual({ success: true });
      // Verify audit insert was called
      expect(mockFrom).toHaveBeenCalledWith("audit_logs");
    });

    it("should throw BadRequestException for invalid body", async () => {
      const invalidBody = { data: { name: "Test" } }; // missing id

      await expect(
        service.updateData("machines", invalidBody as any, "emp-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when update operation fails", async () => {
      const mockFrom = jest.fn();
      mockSupabase.from = mockFrom;

      mockFrom.mockImplementationOnce(() =>
        makeThenable({ data: { id: "r-1" }, error: null }),
      );
      mockFrom.mockImplementationOnce(() =>
        makeThenable({ data: null, error: { message: "Update failed" } }),
      );

      await expect(
        service.updateData("machines", validBody, "emp-1"),
      ).rejects.toThrow("Update failed");
    });
  });

  // ── deleteData ────────────────────────────────────────────────────────

  describe("deleteData", () => {
    it("should delete data and create audit log", async () => {
      const mockFrom = jest.fn();
      mockSupabase.from = mockFrom;

      mockFrom.mockImplementationOnce(() =>
        makeThenable({ data: { id: "r-1" }, error: null }),
      );
      mockFrom.mockImplementationOnce(() =>
        makeThenable({ data: null, error: null }),
      );
      mockFrom.mockImplementationOnce(() =>
        makeThenable({ data: null, error: null }),
      );

      const result = await service.deleteData("machines", "record-1", "emp-1");
      expect(result).toEqual({ success: true });
      expect(mockFrom).toHaveBeenCalledWith("audit_logs");
    });

    it("should throw BadRequestException when id is missing", async () => {
      await expect(service.deleteData("machines", "", "emp-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw when delete operation fails", async () => {
      const mockFrom = jest.fn();
      mockSupabase.from = mockFrom;

      mockFrom.mockImplementationOnce(() =>
        makeThenable({ data: { id: "r-1" }, error: null }),
      );
      mockFrom.mockImplementationOnce(() =>
        makeThenable({
          data: null,
          error: { message: "Delete failed" },
        }),
      );

      await expect(
        service.deleteData("machines", "record-1", "emp-1"),
      ).rejects.toThrow("Delete failed");
    });
  });
});
