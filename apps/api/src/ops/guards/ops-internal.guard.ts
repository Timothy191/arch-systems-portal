import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { SKIP_INTERNAL_AUTH } from "../decorators/skip-internal-auth.decorator";
import type { FastifyRequest } from "fastify";

@Injectable()
export class OpsInternalGuard implements CanActivate {
  private readonly logger = new Logger(OpsInternalGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const reflector = new Reflector();
    const skipAuth = reflector.getAllAndOverride<boolean>(SKIP_INTERNAL_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const secret = this.configService.get<string>("OPS_INTERNAL_SECRET");

    if (!secret) {
      this.logger.warn(
        "OPS_INTERNAL_SECRET not configured — internal ops disabled",
      );
      throw new UnauthorizedException("Ops not configured");
    }

    const token = request.headers["x-ops-secret"];
    if (token !== secret) {
      this.logger.warn("Rejected ops request with invalid secret");
      throw new UnauthorizedException("Invalid ops secret");
    }

    return true;
  }
}
