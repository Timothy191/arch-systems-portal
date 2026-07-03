import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { SupabaseHealthIndicator } from "./indicators/supabase.health";
import { RedisHealthIndicator } from "./indicators/redis.health";
import { OllamaHealthIndicator } from "./indicators/ollama.health";

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [SupabaseHealthIndicator, RedisHealthIndicator, OllamaHealthIndicator],
})
export class HealthModule {}
