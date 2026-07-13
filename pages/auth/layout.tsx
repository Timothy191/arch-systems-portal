import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createServerSupabaseClient,
  getUserSafely,
} from "@repo/supabase/server";

// AGENT-TRACE: Defense-in-depth redirect-if-authed. The proxy.ts middleware
// already redirects an authed user away from /login to "/" via the cookie
// fast-path, but a server-component layout check is a no-cost safety net:
// if the middleware is ever disabled or the cookie path is bypassed (e.g.
// a future rewrite of proxy.ts), an authed user cannot land on the auth
// pages and accidentally sign in again or see the recovery forms. Mirrors
// the same pattern used by LoginPage.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (hasAuthCookie) {
    const supabase = await createServerSupabaseClient();
    const user = await getUserSafely(supabase);
    if (user) {
      redirect("/");
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-28px)] w-full h-full flex overflow-hidden">
      {children}
    </div>
  );
}
