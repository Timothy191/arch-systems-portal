import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from "@nestjs/common";
import { SUPABASE_CLIENT } from "../../supabase/supabase.constants";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyRequest } from "fastify";

/**
 * Global auth guard that validates Supabase session tokens.
 *
 * Reads the `Authorization: Bearer <token>` header or
 * `sb-access-token` cookie and validates the user session.
 *
 * Routes that should skip auth (e.g., /auth/login, /health)
 * use the @Public() decorator.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Check for @Public() decorator metadata
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, context.getHandler());
    if (isPublic) return true;

    // Extract token from Authorization header or cookie
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : this.extractCookieToken(request);

    if (!token) return false;

    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error || !user) return false;

      // Attach user to request for @CurrentUser() decorator
      (request as any).user = user;
      return true;
    } catch {
      return false;
    }
  }

  private extractCookieToken(request: FastifyRequest): string | null {
    const cookies = request.headers.cookie;
    if (!cookies) return null;

    const match = cookies.match(/sb-access-token=([^;]+)/);
    return match?.[1] ?? null;
  }
}
