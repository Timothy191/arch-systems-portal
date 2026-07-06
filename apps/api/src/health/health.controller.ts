import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from "@nestjs/terminus";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { SupabaseHealthIndicator } from "./indicators/supabase.health";
import { RedisHealthIndicator } from "./indicators/redis.health";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly supabase: SupabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: "Full health check (DB, Redis)" })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.supabase.isHealthy(),
      () => this.redis.isHealthy(),
    ]);
  }

  @Get("live")
  @Public()
  @ApiOperation({ summary: "Liveness probe" })
  live() {
    return { status: "ok" };
  }

  @Get("cache")
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: "Cache health check (Redis only)" })
  cache(): Promise<HealthCheckResult> {
    return this.health.check([() => this.redis.isHealthy()]);
  }
}
