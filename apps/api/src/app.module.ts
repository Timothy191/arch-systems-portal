import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { SupabaseModule } from "./supabase/supabase.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { WeatherModule } from "./weather/weather.module";
import { SecurityModule } from "./security/security.module";
import { ToolsModule } from "./tools/tools.module";
import { ObservabilityModule } from "./observability/observability.module";
import { ObservabilitySdkModule } from "./observability/observability-sdk.module";
import { AdminModule } from "./admin/admin.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { ControlRoomModule } from "./control-room/control-room.module";
import { AccessControlModule } from "./access-control/access-control.module";
import { ExportsModule } from "./exports/exports.module";
import { TelemetryModule } from "./telemetry/telemetry.module";
import { JobsModule } from "./jobs/jobs.module";
import { AiBridgeModule } from "./ai-bridge/ai-bridge.module";
import { AiModule } from "./ai/ai.module";

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Global rate limiting (default: 100 requests / 60s)
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // Infrastructure modules
    SupabaseModule,
    RedisModule,

    // Feature modules
    AuthModule,
    HealthModule,
    WeatherModule,
    SecurityModule,
    ToolsModule,
    ObservabilityModule,
    ObservabilitySdkModule,
    AdminModule,
    WebhooksModule,
    ControlRoomModule,
    AccessControlModule,
    ExportsModule,
    TelemetryModule,
    JobsModule,
    AiBridgeModule,
    AiModule,
  ],
})
export class AppModule {}
