import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { scannerBadgeSchema } from "../common/schemas";
import { db } from "@repo/database";

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);
  private readonly allowedScannerSources: string[];
  private readonly expectedToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.expectedToken = this.configService.get("SCANNER_API_KEY");
    this.allowedScannerSources = (
      this.configService.get("ALLOWED_SCANNER_SOURCES") ??
      "C66-HARDWARE,C66-SCANNER,GATE-TERMINAL"
    )
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
    const badge = await db
      .selectFrom("badges")
      .select(["id", "is_active", "entity_type", "personnel_id", "visitor_id"])
      .where("qr_code", "=", code)
      .execute();

    if (!badge || badge.length === 0) {
      await this.logAccess(null, "UNKNOWN", "DENIED - Unrecognized Badge", source);
      throw new NotFoundException("Unrecognized Badge");
    }

    const badgeRecord = badge[0]!;

    if (!badgeRecord.is_active) {
      await this.logAccess(
        badgeRecord.id ?? null,
        badgeRecord.entity_type,
        "DENIED - Badge Revoked",
        source,
      );
      throw new ForbiddenException("Revoked Badge");
    }

    // 2. Resolve the Identity
    let entityName = "Unknown Entity";
    let isAuthorized = true;
    let denialReason: string | null = null;

    if (badgeRecord.entity_type === "personnel" && badgeRecord.personnel_id) {
      const person = await db
        .selectFrom("personnel")
        .select(["first_name", "surname", "status"])
        .where("id", "=", badgeRecord.personnel_id)
        .execute();

      if (person && person.length > 0) {
        entityName = `${person[0]!.first_name} ${person[0]!.surname}`;
        if (person[0]!.status !== "Active") {
          isAuthorized = false;
          denialReason = `DENIED - Personnel Status: ${person[0]!.status}`;
        }
      }
    } else if (badgeRecord.entity_type === "visitor" && badgeRecord.visitor_id) {
      const visitor = await db
        .selectFrom("visitors")
        .select(["name", "status"])
        .where("id", "=", badgeRecord.visitor_id)
        .execute();

      if (visitor && visitor.length > 0) {
        entityName = visitor[0]!.name;
        if (visitor[0]!.status !== "Checked In") {
          isAuthorized = false;
          denialReason = `DENIED - Visitor Status: ${visitor[0]!.status}`;
        }
      }
    }

    // 3. Log the Access event
    await this.logAccess(
      badgeRecord.id ?? null,
      badgeRecord.entity_type,
      isAuthorized ? null : denialReason,
      source,
      isAuthorized,
    );

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
    try {
      await db
        .insertInto("access_logs")
        .values({
          badge_id: badgeId,
          access_type: entityType,
          direction: "IN",
          gate_location: gateLocation,
          access_granted: accessGranted,
          denial_reason: denialReason,
        })
        .execute();
    } catch (error) {
      this.logger.error("access_log_write_failed", error instanceof Error ? error.message : String(error));
    }
  }
}