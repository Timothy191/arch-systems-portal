import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabaseClient, getUserSafely } from "@repo/supabase/server";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoginBrandBanner } from "@/features/auth/components/LoginBrandBanner";
import { LoginEveNotice } from "@/features/auth/components/LoginEveNotice";
import { LoginSecureBadge } from "@/features/auth/components/LoginSecureBadge";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@repo/ui/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In | Arch OS",
  description: "Sign in to Arch Systems",
};

export default async function LoginPage() {
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  let systemUnavailable = false;

  if (hasAuthCookie) {
    const supabase = await createServerSupabaseClient();
    try {
      await getUserSafely(supabase);
    } catch (e) {
      // Only mark as unavailable for auth service failures, not transient errors
      if (
        e instanceof Error &&
        (e.message.includes("AuthRetryableFetchError") ||
          e.message.includes("fetch failed") ||
          e.message.includes("network"))
      ) {
        // Transient — don't show unavailable, just serve the form
        // eslint-disable-next-line no-console
        console.warn("Transient auth check failure, serving login form:", e.message);
      } else {
        systemUnavailable = true;
      }
    }
  }

  return (
    <div className="relative w-full min-h-[calc(100vh-28px)] flex flex-col items-center justify-center pb-16 pt-4 px-4 sm:px-8 md:px-12 lg:px-20 overflow-y-auto">
      {/* Login Card wrapper — centered between taskbar and dock */}
      <div className="relative z-10 w-full max-w-[420px] my-auto mt-24 os-shell-enter-2 flex flex-col justify-center">
        {systemUnavailable ? (
          <div className="glass-card rounded-2xl overflow-hidden w-full">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle bg-[var(--overlay-dim)]">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-3 h-3 rounded-full bg-mac-red border border-border-subtle" />
                <span className="w-3 h-3 rounded-full bg-mac-yellow border border-border-subtle" />
                <span className="w-3 h-3 rounded-full bg-mac-green border border-border-subtle" />
              </div>
              <span className="flex-1 text-center text-[13px] font-medium text-arch-text-secondary select-none pr-14">
                Arch — System Sign In
              </span>
            </div>
            <div className="p-6 space-y-4 text-center">
              <AlertTriangle className="w-8 h-8 text-arch-accent-red mx-auto" strokeWidth={1.5} />
              <h1 className="text-lg font-medium text-arch-text-primary">System Unavailable</h1>
              <p className="text-sm text-arch-text-tertiary">
                Unable to reach authentication services. Please try again shortly or contact IT
                Support.
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 px-4 py-2 text-sm font-medium text-white bg-arch-accent-blue hover:opacity-90 rounded-lg transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arch-accent-blue/50"
              >
                Retry
              </Link>
            </div>
          </div>
        ) : (
          <div
            data-testid="login-card"
            className="os-shell os-shell--login w-full flex flex-col min-h-[720px] overflow-hidden login-card-container"
          >
            {/* Title bar — 8pt grid: 16px inline, 12px block */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-[var(--overlay-dim)]">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-3 h-3 rounded-full bg-mac-red border border-border-subtle" />
                <span className="w-3 h-3 rounded-full bg-mac-yellow border border-border-subtle" />
                <span className="w-3 h-3 rounded-full bg-mac-green border border-border-subtle" />
              </div>
              <span className="flex-1 text-center login-muted-text text-[13px] font-medium tracking-wide select-none pr-14">
                Arch — System Sign In
              </span>
            </div>

            <div className="px-8 sm:px-10 pt-5 pb-9 flex-1 flex flex-col justify-start space-y-6">
              {/* Header Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 select-none">
                  <span className="login-muted-text text-[13px] font-medium tracking-wide">
                    Welcome Back
                  </span>
                </div>
                <LoginSecureBadge />
              </div>

              {/* Title */}
              <div className="flex items-center gap-4">
                <div className="login-brand-mark relative shrink-0" aria-hidden="true">
                  <span className="login-brand-neon" />
                  <div className="login-brand-fold">
                    <span className="login-brand-fold__face login-brand-fold__face--left">
                      <Logo
                        variant="display"
                        stencilId="login-left"
                        className="login-brand-logo text-text-heading"
                      />
                    </span>
                    <span className="login-brand-fold__face login-brand-fold__face--right">
                      <Logo
                        variant="display"
                        stencilId="login-right"
                        className="login-brand-logo text-text-heading"
                      />
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h1 className="font-display text-3xl font-normal tracking-[0.12em] uppercase text-text-heading">
                    ARCH-SYSTEM
                  </h1>
                  <p className="login-muted-text text-[13px] font-medium tracking-wide">
                    Sign in to Arch Systems
                  </p>
                </div>
              </div>

              <LoginForm />

              <LoginEveNotice />
            </div>

            {/* Brand logo marquee */}
            <div className="border-t border-border-subtle bg-[var(--overlay-dim)] select-none px-4 py-3">
              <LoginBrandBanner />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
