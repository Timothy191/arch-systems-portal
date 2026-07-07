import { Test, TestingModule } from "@nestjs/testing";
import { AccessControlService } from "./access-control.service";
import { ConfigService } from "@nestjs/config";
import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

describe("AccessControlService", () => {
  let service: AccessControlService;
  let mockSupabase: any;
  let mockConfig: Record<string, string>;

  function buildModule(supabaseStubs: Record<string, any>) {
    const chain = (response: any) => {
      const fn = jest.fn().mockResolvedValue(response);
      (fn as any).select = jest.fn().mockReturnValue(fn);
      (fn as any).eq = jest.fn().mockReturnValue(fn);
      (fn as any).order = jest.fn().mockReturnValue(fn);
      (fn as any).single = jest.fn().mockResolvedValue(response);
      (fn as any).insert = jest.fn().mockReturnValue(fn);
      (fn as any).is = jest.fn().mockReturnValue(fn);
      (fn as any).or = jest.fn().mockReturnValue(fn);
      (fn as any).limit = jest.fn().mockReturnValue(fn);
      return fn;
    };

    mockSupabase = {
      from: jest.fn((table: string) => {
        const stub = supabaseStubs[table];
        if (!stub) return chain({ data: null, error: null });
        if (typeof stub === "function") return chain(stub());
        return chain(stub);
      }),
    };

    mockConfig = {
      SCANNER_API_KEY: "test-scanner-key",
      ALLOWED_SCANNER_SOURCES: "C66-HARDWARE,C66-SCANNER,GATE-TERMINAL",
    };

    return Test.createTestingModule({
      providers: [
        AccessControlService,
        {
          provide: "SUPABASE_CLIENT",
          useValue: mockSupabase,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();
  }

  describe("validateScannerAuth", () => {
    it("throws UnauthorizedException when token does not match", async () => {
      const mod = await buildModule({});
      service = mod.get(AccessControlService);

      expect(() => service.validateScannerAuth("C66-HARDWARE", "wrong-key")).toThrow(
        UnauthorizedException,
      );
    });

    it("throws ForbiddenException when source is not allowed", async () => {
      const mod = await buildModule({});
      service = mod.get(AccessControlService);

      expect(() =>
        service.validateScannerAuth("UNKNOWN-SOURCE", "test-scanner-key"),
      ).toThrow(ForbiddenException);
    });

    it("passes validation for valid token and allowed source", async () => {
      const mod = await buildModule({});
      service = mod.get(AccessControlService);

      expect(() =>
        service.validateScannerAuth("C66-HARDWARE", "test-scanner-key"),
      ).not.toThrow();
    });
  });

  describe("processBadgeScan", () => {
    it("throws BadRequestException for invalid body", async () => {
      const mod = await buildModule({});
      service = mod.get(AccessControlService);

      await expect(
        service.processBadgeScan({}, "GATE-TERMINAL"),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException for empty code payload", async () => {
      const mod = await buildModule({});
      service = mod.get(AccessControlService);

      await expect(
        service.processBadgeScan(
          { code: "", barcode: "  ", qr_code: "" },
          "GATE-TERMINAL",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException for unrecognized badge", async () => {
      const mod = await buildModule({
        badges: { data: null, error: { message: "not found" } },
      });
      service = mod.get(AccessControlService);

      await expect(
        service.processBadgeScan({ qr_code: "UNKNOWN-CODE" }, "GATE-TERMINAL"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for revoked badge", async () => {
      const mod = await buildModule({
        badges: {
          data: {
            id: "badge-1",
            is_active: false,
            entity_type: "personnel",
            personnel_id: "person-1",
            visitor_id: null,
          },
          error: null,
        },
      });
      service = mod.get(AccessControlService);

      await expect(
        service.processBadgeScan({ qr_code: "REVOKED-CODE" }, "GATE-TERMINAL"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("grants access for active personnel with Active status", async () => {
      const mod = await buildModule({
        badges: {
          data: {
            id: "badge-1",
            is_active: true,
            entity_type: "personnel",
            personnel_id: "person-1",
            visitor_id: null,
          },
          error: null,
        },
        personnel: {
          data: {
            first_name: "John",
            surname: "Doe",
            status: "Active",
          },
          error: null,
        },
      });
      service = mod.get(AccessControlService);

      const result = await service.processBadgeScan(
        { qr_code: "VALID-CODE" },
        "GATE-TERMINAL",
      );

      expect(result).toEqual({
        success: true,
        name: "John Doe",
        message: "Access Granted",
      });
    });

    it("denies access for personnel with non-Active status", async () => {
      const mod = await buildModule({
        badges: {
          data: {
            id: "badge-2",
            is_active: true,
            entity_type: "personnel",
            personnel_id: "person-2",
            visitor_id: null,
          },
          error: null,
        },
        personnel: {
          data: {
            first_name: "Jane",
            surname: "Smith",
            status: "Suspended",
          },
          error: null,
        },
      });
      service = mod.get(AccessControlService);

      const result = await service.processBadgeScan(
        { qr_code: "SUSPENDED-CODE" },
        "GATE-TERMINAL",
      );

      expect(result).toEqual({
        success: false,
        name: "Jane Smith",
        message: "DENIED - Personnel Status: Suspended",
      });
    });

    it("grants access for checked-in visitors", async () => {
      const mod = await buildModule({
        badges: {
          data: {
            id: "badge-3",
            is_active: true,
            entity_type: "visitor",
            personnel_id: null,
            visitor_id: "visitor-1",
          },
          error: null,
        },
        visitors: {
          data: {
            name: "Acme Corp Visitor",
            status: "Checked In",
          },
          error: null,
        },
      });
      service = mod.get(AccessControlService);

      const result = await service.processBadgeScan(
        { barcodeData: "VISITOR-CODE" },
        "GATE-TERMINAL",
      );

      expect(result.success).toBe(true);
    });

    it("handles access_log insert error gracefully (logAccess logger.error branch)", async () => {
      const mod = await buildModule({
        badges: {
          data: {
            id: "badge-1",
            is_active: true,
            entity_type: "personnel",
            personnel_id: "person-1",
            visitor_id: null,
          },
          error: null,
        },
        personnel: {
          data: {
            first_name: "John",
            surname: "Doe",
            status: "Active",
          },
          error: null,
        },
        access_logs: { data: null, error: { message: "insert failed" } },
      });
      service = mod.get(AccessControlService);

      // Even if the access_log insert fails, the badge scan should still succeed
      const result = await service.processBadgeScan(
        { qr_code: "VALID-CODE" },
        "GATE-TERMINAL",
      );

      expect(result).toEqual({
        success: true,
        name: "John Doe",
        message: "Access Granted",
      });
    });

    it("returns Unknown Entity when personnel lookup fails", async () => {
      const mod = await buildModule({
        badges: {
          data: {
            id: "badge-4",
            is_active: true,
            entity_type: "personnel",
            personnel_id: "missing-person",
            visitor_id: null,
          },
          error: null,
        },
        personnel: {
          data: null,
          error: { message: "not found" },
        },
      });
      service = mod.get(AccessControlService);

      const result = await service.processBadgeScan(
        { code: "MISSING-PERSON-CODE" },
        "GATE-TERMINAL",
      );

      expect(result.name).toBe("Unknown Entity");
    });
  });
});
