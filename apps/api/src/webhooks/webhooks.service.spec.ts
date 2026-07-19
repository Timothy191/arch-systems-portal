import { Test } from "@nestjs/testing";
import { WebhooksService } from "./webhooks.service";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

describe("WebhooksService", () => {
  let service: WebhooksService;
  let mockSupabase: any;

  function makeChain(response: any) {
    const chain: any = {
      then(resolve: Function) {
        return resolve(response);
      },
    };
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.order = () => chain;
    chain.single = () => chain;
    chain.insert = () => chain;
    chain.update = () => chain;
    chain.is = () => chain;
    chain.or = () => chain;
    chain.limit = () => chain;
    return chain;
  }

  function buildModule(tableStubs: Record<string, any>) {
    mockSupabase = {
      from: jest.fn((table: string) => {
        const stub = tableStubs[table];
        if (!stub) return makeChain({ data: null, error: null });
        return makeChain(stub);
      }),
    };

    return Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: "SUPABASE_CLIENT",
          useValue: mockSupabase,
        },
      ],
    }).compile();
  }

  describe("getEmployee", () => {
    it("returns employee when found", async () => {
      const employeeData = {
        id: "emp-1",
        department_id: "dept-1",
        role: "user",
        accessible_departments: [],
      };
      const mod = await buildModule({
        employees: { data: employeeData, error: null },
      });
      service = mod.get(WebhooksService);

      const result = await service.getEmployee("auth-user-1");
      expect(result).toEqual(employeeData);
    });

    it("throws NotFoundException when employee not found", async () => {
      const mod = await buildModule({
        employees: { data: null, error: { message: "not found" } },
      });
      service = mod.get(WebhooksService);

      await expect(service.getEmployee("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("listWebhooks", () => {
    const adminEmployee = {
      department_id: "dept-1",
      role: "admin" as const,
      accessible_departments: null,
    };

    const nonAdminEmployee = {
      department_id: "dept-1",
      role: "user" as const,
      accessible_departments: ["dept-2"],
    };

    const isolatedEmployee = {
      department_id: "dept-1",
      role: "user" as const,
      accessible_departments: [],
    };

    it("returns all webhooks for admin", async () => {
      const webhooksData = [{ id: "wh-1", url: "https://example.com" }];
      const mod = await buildModule({
        webhook_endpoints: { data: webhooksData, error: null },
      });
      service = mod.get(WebhooksService);

      const result = await service.listWebhooks(adminEmployee);
      expect(result.webhooks).toEqual(webhooksData);
    });

    it("filters webhooks for non-admin with accessible departments", async () => {
      const webhooksData = [{ id: "wh-1" }];
      const mod = await buildModule({
        webhook_endpoints: { data: webhooksData, error: null },
      });
      service = mod.get(WebhooksService);

      await service.listWebhooks(nonAdminEmployee);
      expect(mockSupabase.from).toHaveBeenCalledWith("webhook_endpoints");
    });

    it("filters by own department for non-admin without accessible departments", async () => {
      const webhooksData = [{ id: "wh-1" }];
      const mod = await buildModule({
        webhook_endpoints: { data: webhooksData, error: null },
      });
      service = mod.get(WebhooksService);

      const result = await service.listWebhooks(isolatedEmployee);
      expect(result.webhooks).toEqual(webhooksData);
    });

    it("throws on database error", async () => {
      const mod = await buildModule({
        webhook_endpoints: { data: null, error: { message: "db error" } },
      });
      service = mod.get(WebhooksService);

      await expect(service.listWebhooks(adminEmployee)).rejects.toThrow(
        "Database query failed",
      );
    });
  });

  describe("createWebhook", () => {
    const adminEmployee = {
      department_id: "dept-1",
      role: "admin" as const,
      accessible_departments: null,
    };

    it("creates webhook successfully for admin", async () => {
      const newWebhook = {
        id: "wh-new",
        url: "https://hooks.example.com",
        event_types: ["order.placed"],
        department_id: "550e8400-e29b-41d4-a716-446655440000",
      };
      const mod = await buildModule({
        webhook_endpoints: { data: newWebhook, error: null },
      });
      service = mod.get(WebhooksService);

      const result = await service.createWebhook(adminEmployee, {
        url: "https://hooks.example.com",
        event_types: ["order.placed"],
        department_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.webhook).toEqual(newWebhook);
    });

    it("throws BadRequestException for invalid body", async () => {
      const mod = await buildModule({});
      service = mod.get(WebhooksService);

      await expect(
        service.createWebhook(adminEmployee, { url: "not-a-url" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("allows non-admin to create in their own department", async () => {
      const newWebhook = {
        id: "wh-new",
        url: "https://hooks.example.com",
        event_types: ["order.placed"],
        department_id: "550e8400-e29b-41d4-a716-446655440000",
      };
      const mod = await buildModule({
        webhook_endpoints: { data: newWebhook, error: null },
      });
      service = mod.get(WebhooksService);

      const result = await service.createWebhook(
        {
          department_id: "550e8400-e29b-41d4-a716-446655440000",
          role: "user",
          accessible_departments: [],
        },
        {
          url: "https://hooks.example.com",
          event_types: ["order.placed"],
          department_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      );
      expect(result.webhook!.id).toBe("wh-new");
    });

    it("throws ForbiddenException for non-admin creating in unauthorized department", async () => {
      const mod = await buildModule({});
      service = mod.get(WebhooksService);

      await expect(
        service.createWebhook(
          {
            department_id: "550e8400-e29b-41d4-a716-446655440000",
            role: "user",
            accessible_departments: [],
          },
          {
            url: "https://hooks.example.com",
            event_types: ["order.placed"],
            department_id: "660f8400-e29b-41d4-a716-446655440001",
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateWebhook", () => {
    const adminEmployee = {
      department_id: "dept-1",
      role: "admin" as const,
      accessible_departments: null,
    };

    const existingWebhook = {
      id: "wh-1",
      url: "https://old.example.com",
      description: "Old description",
      event_types: ["order.created"],
      active: true,
      department_id: "dept-1",
    };

    it("updates all fields for admin", async () => {
      const updatedData = {
        ...existingWebhook,
        url: "https://new.example.com",
        description: "New description",
        event_types: ["order.shipped"],
        active: false,
      };
      const mod = await buildModule({
        webhook_endpoints: { data: updatedData, error: null },
      });
      service = mod.get(WebhooksService);

      const result = await service.updateWebhook("wh-1", adminEmployee, {
        url: "https://new.example.com",
        description: "New description",
        event_types: ["order.shipped"],
        active: false,
      });
      expect(result.webhook).toEqual(updatedData);
    });

    it("throws BadRequestException for invalid body", async () => {
      const mod = await buildModule({});
      service = mod.get(WebhooksService);

      await expect(
        service.updateWebhook("wh-1", adminEmployee, { url: 123 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when webhook does not exist", async () => {
      const mod = await buildModule({
        webhook_endpoints: { data: null, error: { message: "not found" } },
      });
      service = mod.get(WebhooksService);

      await expect(
        service.updateWebhook("wh-nonexistent", adminEmployee, {
          url: "https://example.com",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when non-admin updates webhook from other department", async () => {
      const mod = await buildModule({
        webhook_endpoints: {
          data: { id: "wh-1", department_id: "dept-other" },
          error: null,
        },
      });
      service = mod.get(WebhooksService);

      await expect(
        service.updateWebhook(
          "wh-1",
          { department_id: "dept-1", role: "user", accessible_departments: [] },
          { url: "https://example.com" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows non-admin to update own department webhook", async () => {
      const updatedData = {
        ...existingWebhook,
        description: "Updated by user",
      };
      const mod = await buildModule({
        webhook_endpoints: { data: updatedData, error: null },
      });
      service = mod.get(WebhooksService);

      const result = await service.updateWebhook(
        "wh-1",
        { department_id: "dept-1", role: "user", accessible_departments: [] },
        { description: "Updated by user" },
      );
      expect(result.webhook!.description).toBe("Updated by user");
    });

    it("partially updates only the provided fields", async () => {
      const updatedData = { ...existingWebhook, active: false };
      const mod = await buildModule({
        webhook_endpoints: { data: updatedData, error: null },
      });
      service = mod.get(WebhooksService);

      const result = await service.updateWebhook("wh-1", adminEmployee, {
        active: false,
      });
      expect(result.webhook!.active).toBe(false);
      expect(result.webhook!.url).toBe(existingWebhook.url); // unchanged
    });
  });

  describe("deleteWebhook", () => {
    const adminEmployee = {
      department_id: "dept-1",
      role: "admin" as const,
      accessible_departments: null,
    };

    it("soft-deletes webhook for admin", async () => {
      const mod = await buildModule({
        webhook_endpoints: {
          data: { id: "wh-1", department_id: "dept-1" },
          error: null,
        },
      });
      service = mod.get(WebhooksService);

      const result = await service.deleteWebhook("wh-1", adminEmployee);
      expect(result).toEqual({ success: true });
    });

    it("throws NotFoundException when webhook does not exist", async () => {
      const mod = await buildModule({
        webhook_endpoints: { data: null, error: { message: "not found" } },
      });
      service = mod.get(WebhooksService);

      await expect(
        service.deleteWebhook("wh-nonexistent", adminEmployee),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when non-admin deletes webhook from other department", async () => {
      const mod = await buildModule({
        webhook_endpoints: {
          data: { id: "wh-1", department_id: "dept-other" },
          error: null,
        },
      });
      service = mod.get(WebhooksService);

      await expect(
        service.deleteWebhook("wh-1", {
          department_id: "dept-1",
          role: "user",
          accessible_departments: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows non-admin to delete own department webhook", async () => {
      const mod = await buildModule({
        webhook_endpoints: {
          data: { id: "wh-1", department_id: "dept-1" },
          error: null,
        },
      });
      service = mod.get(WebhooksService);

      const result = await service.deleteWebhook("wh-1", {
        department_id: "dept-1",
        role: "user",
        accessible_departments: [],
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("getLogs", () => {
    const adminEmployee = {
      department_id: "dept-1",
      role: "admin" as const,
      accessible_departments: null,
    };

    it("returns logs for admin", async () => {
      const logsData = [{ id: "log-1", status: "delivered" }];
      const mod = await buildModule({
        webhook_endpoints: {
          data: { id: "wh-1", department_id: "dept-1" },
          error: null,
        },
        webhook_delivery_logs: { data: logsData, error: null },
      });
      service = mod.get(WebhooksService);

      const result = await service.getLogs("wh-1", adminEmployee);
      expect(result.logs).toEqual(logsData);
    });

    it("throws NotFoundException when webhook not found", async () => {
      const mod = await buildModule({
        webhook_endpoints: { data: null, error: { message: "not found" } },
      });
      service = mod.get(WebhooksService);

      await expect(
        service.getLogs("wh-nonexistent", adminEmployee),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
