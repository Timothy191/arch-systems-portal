import { Global, Module } from "@nestjs/common";
import { SUPABASE_CLIENT } from "./supabase.constants";
import { createServiceRoleClient } from "@repo/supabase/service-role";

export const SUPABASE_TOKEN = SUPABASE_CLIENT;

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      useFactory: () => createServiceRoleClient(),
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
