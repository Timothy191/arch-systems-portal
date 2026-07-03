import { Injectable, Inject, Logger, UnauthorizedException, ForbiddenException, BadRequestException, NotFoundException } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import { ConfigService } from "@nestjs/config";
import { scannerBadgeSchema } from "../common/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);
  private readonly allowedScannerSources: string[];
  private readonly expectedToken: string | undefined;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
  ) {
    this.expectedToken = this.configService.get("SCANNER_API_KEY");
    this.allowedScannerSources = (this.configService.get("ALLOWED_SCANNER_SOURCES") ?? "C66-HARDWARE,C66-SCANNER,GATE-TERMINAL")
      .split(",")
      .map((s: string) => s.trim());
  }

  validateScannerAuth(source: string | null, token: string | null): void {
    if (!this.expectedToken || token !== this.expectedToken) {
      throw new UnauthorizedException("Unauthorized scanner token");
    }

    if (source && !this.allowedScannerSources.includes(source)) {
      throw new ForbiddenException("Unauthorized scanner source");
    }
  }

  async processBadgeScan(body: any, source: string) {
    const parsed = scannerBadgeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const code = (
      parsed.data.code ||
      parsed.data.barcode ||
      parsed.data.barcodeData ||
      parsed.data.data ||
      parsed.data.qr_code ||
      ""
    ).trim();

    if (!code) {
      throw new BadRequestException("Empty code payload");
    }

    // 1. Find the Badge and check if it's active
    const { data: badge, error: badgeError } = await this.supabase
      .from("badges")
      .select("id, is_active, entity_type, personnel_id, visitor_id")
      .eq("qr_code", code)
      .single();

    if (badgeError || !badge) {
      await this.logAccess(null, "UNKNOWN", "DENIED - Unrecognized Badge", source);
      throw new NotFoundException("Unrecognized Badge");
    }

    if (!badge.is_active) {
      await this.logAccess(badge.id, badge.entity_type, "DENIED - Badge Revoked", source);
      throw new ForbiddenException("Revoked Badge");
    }

    // 2. Resolve the Identity
    let entityName = "Unknown Entity";
    let isAuthorized = true;
    let denialReason: string | null = null;

    if (badge.entity_type === "personnel" && badge.personnel_id) {
      const { data: person } = await this.supabase
        .from("personnel")
        .select("first_name, surname, status")
        .eq("id", badge.personnel_id)
        .single();
      if (person) {
        entityName = `${person.first_name} ${person.surname}`;
        if (person.status !== "Active") {
          isAuthorized = false;
          denialReason = `DENIED - Personnel Status: ${person.status}`;
        }
      }
    } else if (badge.entity_type === "visitor" && badge.visitor_id) {
      const { data: visitor } = await this.supabase
        .from("visitors")
        .select("name, status")
        .eq("id", badge.visitor_id)
        .single();
      if (visitor) {
        entityName = visitor.name;
        if (visitor.status !== "Checked In") {
          isAuthorized = false;
          denialReason = `DENIED - Visitor Status: ${visitor.status}`;
        }
      }
    }

    // 3. Log the Access event
    await this.logAccess(badge.id, badge.entity_type, isAuthorized ? null : denialReason, source, isAuthorized);

    return {
      success: isAuthorized,
      name: entityName,
      message: isAuthorized ? "Access Granted" : denialReason,
    };
  }

  private async logAccess(
    badgeId: string | null,
    entityType: string,
    denialReason: string | null,
    gateLocation: string,
    accessGranted = false,
  ) {
    const { error } = await this.supabase.from("access_logs").insert([
      {
        badge_id: badgeId,
        access_type: entityType,
        direction: "IN",
        gate_location: gateLocation,
        access_granted: accessGranted,
        denial_reason: denialReason,
      },
    ]);

    if (error) {
      this.logger.error("access_log_write_failed", error.message);
    }
  }
}
