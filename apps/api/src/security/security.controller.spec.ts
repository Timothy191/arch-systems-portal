import { Test, TestingModule } from "@nestjs/testing";
import { SecurityController } from "./security.controller";

describe("SecurityController", () => {
  let controller: SecurityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityController],
    }).compile();

    controller = module.get<SecurityController>(SecurityController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should handle CSP violation report with csp-report key", () => {
    const report = {
      "csp-report": {
        "document-uri": "https://example.com/page",
        referrer: "",
        "blocked-uri": "https://evil.com/script.js",
        "violated-directive": "script-src 'self'",
        "effective-directive": "script-src",
        "original-policy": "default-src 'self'",
        disposition: "enforce",
        "status-code": 200,
      },
    };

    // Should not throw
    expect(() => controller.report(report)).not.toThrow();
  });

  it("should handle CSP violation report with camelCase key", () => {
    const report = {
      cspReport: {
        "document-uri": "https://example.com/page",
        referrer: "",
        "blocked-uri": "https://evil.com/style.css",
        "violated-directive": "style-src 'self'",
        "effective-directive": "style-src",
        "original-policy": "default-src 'self'",
        disposition: "report",
        "status-code": 200,
      },
    };

    expect(() => controller.report(report)).not.toThrow();
  });

  it("should return 204 (no content) for valid CSP reports", () => {
    const report = {
      "csp-report": {
        "document-uri": "https://example.com",
        referrer: "",
        "blocked-uri": "https://evil.com",
        "violated-directive": "script-src 'self'",
        "effective-directive": "script-src",
        "original-policy": "default-src 'self'",
        disposition: "enforce",
        "status-code": 200,
      },
    };

    const result = controller.report(report);
    expect(result).toBeUndefined();
  });

  it("should handle empty body gracefully", () => {
    expect(() => controller.report({})).not.toThrow();
  });

  it("should handle malformed report without field", () => {
    const result = controller.report({ random: "data" });
    expect(result).toBeUndefined();
  });
});
