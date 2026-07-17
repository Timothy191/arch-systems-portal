# Login Form Redesign — Requirements

## Intent

Enlarge and reposition the Arch System Sign In card, and add commonly expected login affordances: Remember me, Forgot password, and social sign-in (Google / Microsoft / GitHub).

## Acceptance Criteria

1. Login card is wider than 380px (target ~480px) and better vertically centered on the viewport (reduced awkward `-top-16` offset).
2. Form includes a **Remember me** checkbox that, when checked, persists the employee ID/email in `localStorage` and restores it on next visit.
3. Form includes a **Forgot password?** link to `/reset-password`.
4. Form includes an “or continue with” divider and social buttons for **Google**, **Microsoft**, and **GitHub**.
5. Social buttons initiate Supabase `signInWithOAuth` with `redirectTo` pointing at `/auth/callback`.
6. `/auth/callback` exchanges the OAuth code for a session and redirects to `/` (or a safe `?next=` path).
7. Password sign-in via `/api/auth/login` remains unchanged in behavior.
8. Interactive elements are keyboard-accessible with visible focus rings; labels are associated with controls.
9. LoginForm tests cover new controls (remember me persistence, forgot-password link, OAuth button presence) and existing success/failure paths.
10. No new npm packages; lucide-react icons only; no secrets in client code.
