import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SupabaseAuthGuard } from "./guards/supabase-auth.guard";
import { APP_GUARD } from "@nestjs/core";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
