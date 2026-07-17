# Login Form Redesign — Design

## Files

- [`apps/portal/src/app/(auth)/login/page.tsx`](../../../apps/portal/src/app/(auth)/login/page.tsx) — wider card, centered positioning, denser content grid.
- [`apps/portal/src/features/auth/components/LoginForm.tsx`](../../../apps/portal/src/features/auth/components/LoginForm.tsx) — full form implementation in portal (stop thin re-export) with remember me, forgot password, OAuth.
- [`apps/portal/src/app/auth/callback/page.tsx`](../../../apps/portal/src/app/auth/callback/page.tsx) — client OAuth PKCE code exchange + redirect.
- [`apps/portal/src/features/auth/components/LoginForm.test.tsx`](../../../apps/portal/src/features/auth/components/LoginForm.test.tsx) — updated assertions.
- [`apps/portal/.env.example`](../../../apps/portal/.env.example) — note that OAuth providers must be enabled in Supabase.

`RefractionGlow` remains re-exported from `@repo/auth/ui`. Package form stub stays for legacy importers but portal uses its own form.

## Layout

- Wrapper: `w-full max-w-[480px]` (was `w-[380px]`), `my-auto`, drop large `-top-16` (use modest `-top-4` or none).
- Card body: slightly tighter vertical rhythm (`space-y-6`), OAuth as `grid grid-cols-3 gap-2`.
- Glow behind card scales with larger width.

## Form behavior

| Control | Behavior |
|---|---|
| Remember me | `localStorage` key `arch-login-remember-email`; save on successful submit if checked; clear if unchecked |
| Forgot password | `Link` → `/reset-password` |
| Google / Microsoft / GitHub | `createBrowserSupabaseClient().auth.signInWithOAuth({ provider, options: { redirectTo: origin + '/auth/callback' } })`; toast on error |

Providers: `google`, `azure`, `github`.

## Callback

`GET /auth/callback?code=…&next=…` — validate `next` is same-origin path, call browser-compatible exchange via server route using anon client `exchangeCodeForSession(code)`, then `NextResponse.redirect`.

## Boundaries

- Client: LoginForm (`"use client"`), uses `@repo/supabase/client`.
- Server: callback `route.ts`, Zod-safe path validation, no service-role key.
